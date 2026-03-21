from __future__ import annotations

import json
import os
import threading
from base64 import b64decode
from io import BytesIO

import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS
from PIL import Image, ImageOps

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_DIR = os.path.dirname(BASE_DIR)

LANDMARK_WEIGHTS_PATH = os.path.join(BASE_DIR, "model", "weights.npz")
LANDMARK_LABELMAP_PATH = os.path.join(BASE_DIR, "model", "label_map.json")

IMAGE_MODEL_DIR = os.environ.get(
    "ISL_IMAGE_MODEL_DIR",
    os.path.join(REPO_DIR, "model_outputs", "alnum_deadline_10h_20260321_020023"),
)
IMAGE_MODEL_PATH = os.path.join(IMAGE_MODEL_DIR, "model.keras")
IMAGE_LABELMAP_PATH = os.path.join(IMAGE_MODEL_DIR, "label_map.json")
DEFAULT_IMAGE_SIZE = int(os.environ.get("ISL_IMAGE_SIZE", "96"))

image_model = None
image_label_map = None
image_model_loading = False
image_model_load_error = None
image_model_lock = threading.Lock()

landmark_model = None
landmark_label_map = None
landmark_model_loading = False
landmark_model_load_error = None
landmark_model_lock = threading.Lock()


def build_landmark_model(num_classes):
    from tensorflow.keras.layers import BatchNormalization, Dense, Dropout
    from tensorflow.keras.models import Sequential

    return Sequential(
        [
            Dense(256, activation="relu", input_shape=(63,)),
            BatchNormalization(),
            Dropout(0.3),
            Dense(128, activation="relu"),
            BatchNormalization(),
            Dropout(0.3),
            Dense(64, activation="relu"),
            Dropout(0.2),
            Dense(num_classes, activation="softmax"),
        ]
    )


def load_image_model():
    global image_model, image_label_map, image_model_loading, image_model_load_error

    with image_model_lock:
        if image_model is not None:
            return True

        image_model_loading = True
        image_model_load_error = None

        try:
            if not os.path.exists(IMAGE_MODEL_PATH):
                raise FileNotFoundError(f"Image model not found at {IMAGE_MODEL_PATH}")
            if not os.path.exists(IMAGE_LABELMAP_PATH):
                raise FileNotFoundError(f"Image label map not found at {IMAGE_LABELMAP_PATH}")

            with open(IMAGE_LABELMAP_PATH, "r", encoding="utf-8") as file:
                next_label_map = json.load(file)

            from tensorflow import keras

            next_model = keras.models.load_model(IMAGE_MODEL_PATH)

            image_model = next_model
            image_label_map = next_label_map
            print(f"Image model loaded successfully from {IMAGE_MODEL_PATH}")
            return True
        except Exception as error:
            image_model = None
            image_label_map = None
            image_model_load_error = str(error)
            print(f"Image model not loaded: {error}")
            return False
        finally:
            image_model_loading = False


def load_landmark_model():
    global landmark_model, landmark_label_map, landmark_model_loading, landmark_model_load_error

    with landmark_model_lock:
        if landmark_model is not None:
            return True

        landmark_model_loading = True
        landmark_model_load_error = None

        try:
            with open(LANDMARK_LABELMAP_PATH, "r", encoding="utf-8") as file:
                next_label_map = json.load(file)

            num_classes = len(next_label_map)
            next_model = build_landmark_model(num_classes)
            weights_data = np.load(LANDMARK_WEIGHTS_PATH, allow_pickle=True)
            weights = [weights_data[f"arr_{index}"] for index in range(len(weights_data.files))]
            next_model.set_weights(weights)

            landmark_model = next_model
            landmark_label_map = next_label_map
            print("Landmark model loaded successfully")
            return True
        except Exception as error:
            landmark_model = None
            landmark_label_map = None
            landmark_model_load_error = str(error)
            print(f"Landmark model not loaded: {error}")
            return False
        finally:
            landmark_model_loading = False


def ensure_image_model_loading():
    if image_model is not None or image_model_loading:
        return

    def runner():
        load_image_model()

    threading.Thread(target=runner, daemon=True).start()


def get_model_status(loaded_model, loading_flag, error_message):
    if loaded_model is not None:
        return "loaded"
    if loading_flag:
        return "loading"
    if error_message:
        return "error"
    return "not loaded"


def get_image_input_size() -> int:
    if image_model is not None:
        input_shape = getattr(image_model, "input_shape", None)
        if input_shape and len(input_shape) >= 3 and input_shape[1]:
            return int(input_shape[1])
    return DEFAULT_IMAGE_SIZE


def decode_image_payload(image_payload: str, image_size: int) -> np.ndarray:
    if not isinstance(image_payload, str) or not image_payload.strip():
        raise ValueError("No image payload provided")

    encoded = image_payload.strip()
    if encoded.startswith("data:"):
        _, encoded = encoded.split(",", 1)

    try:
        image_bytes = b64decode(encoded)
    except Exception as error:
        raise ValueError("Invalid base64 image payload") from error

    with Image.open(BytesIO(image_bytes)) as image:
        image = ImageOps.exif_transpose(image).convert("RGB")
        resampling = getattr(Image, "Resampling", Image)
        image = ImageOps.fit(
            image,
            (image_size, image_size),
            method=resampling.BILINEAR,
            centering=(0.5, 0.5),
        )
        image_array = np.asarray(image, dtype=np.float32)

    return np.expand_dims(image_array, axis=0)


def predict_from_image_payload(image_payload: str):
    if image_model is None:
        loaded = load_image_model()
        if not loaded:
            raise RuntimeError(image_model_load_error or "Image model is still loading")

    image_size = get_image_input_size()
    image_batch = decode_image_payload(image_payload, image_size)
    prediction = image_model.predict(image_batch, verbose=0)[0]
    class_idx = int(np.argmax(prediction))
    confidence = float(prediction[class_idx])
    sign = image_label_map.get(str(class_idx), "Unknown")

    top_indices = np.argsort(prediction)[::-1][:3]
    top_predictions = [
        {
            "label": image_label_map.get(str(int(index)), "Unknown"),
            "confidence": round(float(prediction[int(index)]), 4),
        }
        for index in top_indices
    ]

    return {
        "sign": sign,
        "confidence": round(confidence, 4),
        "mode": "image_model",
        "prediction_input": "image",
        "top_predictions": top_predictions,
    }


def predict_from_landmarks_payload(landmarks_payload):
    landmarks = np.asarray(landmarks_payload, dtype=np.float32)
    if landmarks.size != 63:
        raise ValueError("Expected 63 landmark values")

    if landmark_model is None:
        loaded = load_landmark_model()
        if not loaded:
            raise RuntimeError(landmark_model_load_error or "Landmark model is still loading")

    landmarks = landmarks.reshape(1, -1)
    prediction = landmark_model.predict(landmarks, verbose=0)[0]
    class_idx = int(np.argmax(prediction))
    confidence = float(prediction[class_idx])
    sign = landmark_label_map.get(str(class_idx), "Unknown")

    return {
        "sign": sign,
        "confidence": round(confidence, 4),
        "mode": "landmark_model",
        "prediction_input": "landmarks",
    }


ensure_image_model_loading()


@app.route("/", methods=["GET"])
def home():
    ensure_image_model_loading()
    return jsonify(
        {
            "status": "running",
            "team": "Team ALPHA",
            "project": "ISL Bridge",
            "model": get_model_status(image_model, image_model_loading, image_model_load_error),
            "model_type": "tensorflow_image",
            "prediction_input": "image",
        }
    )


@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json(silent=True) or {}

        if "image" in data:
            return jsonify(predict_from_image_payload(data["image"]))

        if "landmarks" in data:
            return jsonify(predict_from_landmarks_payload(data["landmarks"]))

        return jsonify({"error": "Provide either image or landmarks"}), 400
    except ValueError as error:
        return jsonify({"error": str(error)}), 400
    except RuntimeError as error:
        return jsonify({"error": "Model is unavailable", "details": str(error)}), 503
    except Exception as error:
        return jsonify({"error": str(error)}), 500


@app.route("/health", methods=["GET"])
def health():
    ensure_image_model_loading()
    return jsonify(
        {
            "status": "healthy",
            "model": get_model_status(image_model, image_model_loading, image_model_load_error),
            "model_type": "tensorflow_image",
            "prediction_input": "image",
            "supported_inputs": ["image", "landmarks"],
            "supported_targets": ["alphabet"],
            "signs_count": len(image_label_map) if image_label_map else 0,
            "signs": list(image_label_map.values()) if image_label_map else [],
            "image_model_path": IMAGE_MODEL_PATH,
            "image_size": get_image_input_size(),
            "error": image_model_load_error,
            "legacy_landmark_model": get_model_status(
                landmark_model,
                landmark_model_loading,
                landmark_model_load_error,
            ),
        }
    )


@app.route("/signs", methods=["GET"])
def get_signs():
    ensure_image_model_loading()
    if image_label_map:
        return jsonify(
            {
                "signs": list(image_label_map.values()),
                "prediction_input": "image",
                "image_size": get_image_input_size(),
            }
        )

    return jsonify(
        {
            "signs": [],
            "note": "Image model not loaded yet",
            "error": image_model_load_error,
        }
    )


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "0") == "1"
    app.run(host="0.0.0.0", port=port, debug=debug)


