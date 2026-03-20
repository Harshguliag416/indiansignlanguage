from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
import threading

import numpy as np

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WEIGHTS_PATH = os.path.join(BASE_DIR, 'model', 'weights.npz')
LABELMAP_PATH = os.path.join(BASE_DIR, 'model', 'label_map.json')

model = None
label_map = None
model_loading = False
model_load_error = None
model_lock = threading.Lock()


def build_model(num_classes):
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import Dense, Dropout, BatchNormalization

    return Sequential([
        Dense(256, activation='relu', input_shape=(63,)),
        BatchNormalization(),
        Dropout(0.3),
        Dense(128, activation='relu'),
        BatchNormalization(),
        Dropout(0.3),
        Dense(64, activation='relu'),
        Dropout(0.2),
        Dense(num_classes, activation='softmax'),
    ])


def load_model():
    global model, label_map, model_loading, model_load_error

    with model_lock:
        if model is not None:
            return True

        model_loading = True
        model_load_error = None

        try:
            with open(LABELMAP_PATH, 'r', encoding='utf-8') as file:
                next_label_map = json.load(file)

            num_classes = len(next_label_map)
            next_model = build_model(num_classes)
            weights_data = np.load(WEIGHTS_PATH, allow_pickle=True)
            weights = [weights_data[f'arr_{index}'] for index in range(len(weights_data.files))]
            next_model.set_weights(weights)

            model = next_model
            label_map = next_label_map

            print('Model loaded successfully')
            print(f'Signs: {list(label_map.values())}')
            return True
        except Exception as error:
            model = None
            label_map = None
            model_load_error = str(error)
            print(f'Model not loaded: {error}')
            return False
        finally:
            model_loading = False


def ensure_model_loading():
    if model is not None or model_loading:
        return

    def runner():
        load_model()

    threading.Thread(target=runner, daemon=True).start()


ensure_model_loading()


@app.route('/', methods=['GET'])
def home():
    ensure_model_loading()
    return jsonify({
        'status': 'running',
        'team': 'Team ALPHA',
        'project': 'ISL Bridge',
        'model': 'loaded' if model else 'loading' if model_loading else 'error' if model_load_error else 'not loaded',
    })


@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        if not data or 'landmarks' not in data:
            return jsonify({'error': 'No landmarks provided'}), 400

        landmarks = np.asarray(data['landmarks'], dtype=np.float32)
        if landmarks.size != 63:
            return jsonify({'error': 'Expected 63 landmark values'}), 400

        if model is None:
            loaded = load_model()
            if not loaded:
                return jsonify({
                    'error': 'Model is unavailable',
                    'details': model_load_error or 'Model is still loading',
                }), 503

        landmarks = landmarks.reshape(1, -1)
        prediction = model.predict(landmarks, verbose=0)
        class_idx = int(np.argmax(prediction))
        confidence = float(np.max(prediction)) * 100
        sign = label_map.get(str(class_idx), 'Unknown')
        return jsonify({
            'sign': sign,
            'confidence': round(confidence, 2),
            'mode': 'model',
        })
    except Exception as error:
        return jsonify({'error': str(error)}), 500


@app.route('/health', methods=['GET'])
def health():
    ensure_model_loading()
    return jsonify({
        'status': 'healthy',
        'model': 'loaded' if model else 'loading' if model_loading else 'error' if model_load_error else 'not loaded',
        'signs_count': len(label_map) if label_map else 0,
        'error': model_load_error,
    })


@app.route('/signs', methods=['GET'])
def get_signs():
    if label_map:
        return jsonify({'signs': list(label_map.values())})

    return jsonify({
        'signs': [],
        'note': 'Model not loaded yet',
        'error': model_load_error,
    })


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', '0') == '1'
    app.run(host='0.0.0.0', port=port, debug=debug)
