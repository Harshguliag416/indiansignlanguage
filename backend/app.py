from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os

import numpy as np

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WEIGHTS_PATH = os.path.join(BASE_DIR, 'model', 'weights.npz')
LABELMAP_PATH = os.path.join(BASE_DIR, 'model', 'label_map.json')

model = None
label_map = None


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
    global model, label_map

    try:
        with open(LABELMAP_PATH, 'r', encoding='utf-8') as file:
            label_map = json.load(file)

        num_classes = len(label_map)
        model = build_model(num_classes)
        weights_data = np.load(WEIGHTS_PATH, allow_pickle=True)
        weights = [weights_data[f'arr_{index}'] for index in range(len(weights_data.files))]
        model.set_weights(weights)

        print('Model loaded successfully')
        print(f'Signs: {list(label_map.values())}')
    except Exception as error:
        model = None
        label_map = None
        print(f'Model not loaded: {error}')
        print('Running in mock mode')


load_model()


@app.route('/', methods=['GET'])
def home():
    return jsonify({
        'status': 'running',
        'team': 'Team ALPHA',
        'project': 'ISL Bridge',
        'model': 'loaded' if model else 'not loaded yet',
    })


@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        if not data or 'landmarks' not in data:
            return jsonify({'error': 'No landmarks provided'}), 400

        landmarks = np.array(data['landmarks'])

        if model is not None and label_map:
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

        import random

        mock_signs = [
            'I need help', 'Call doctor', 'I am in pain',
            'Thank you', 'I am deaf', 'Call police',
            'Water please', 'Emergency', 'I am lost',
            'I am hungry',
        ]
        return jsonify({
            'sign': random.choice(mock_signs),
            'confidence': round(random.uniform(85, 98), 2),
            'mode': 'mock',
        })
    except Exception as error:
        return jsonify({'error': str(error)}), 500


@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'model': 'loaded' if model else 'not loaded',
        'signs_count': len(label_map) if label_map else 0,
    })


@app.route('/signs', methods=['GET'])
def get_signs():
    if label_map:
        return jsonify({'signs': list(label_map.values())})

    return jsonify({'signs': [], 'note': 'Model not loaded yet'})


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', '0') == '1'
    app.run(host='0.0.0.0', port=port, debug=debug)
