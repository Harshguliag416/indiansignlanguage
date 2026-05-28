# ISL Bridge

![WIP](https://img.shields.io/badge/status-WIP-orange?style=flat)
![Accuracy](https://img.shields.io/badge/accuracy-96%25--98%25-brightgreen?style=flat)

## Overview

ISL Bridge is an Indian Sign Language translator built for real-time communication and accessibility. It combines video-based sign recognition, a Flask API, and a mobile-ready React Native interface.

## What Works

- Real-time sign detection using **MediaPipe**
- Gesture classification with **TensorFlow**
- High prototype accuracy: **96-98%** for trained alphabets
- Flask backend serving model predictions
- React Native frontend for mobile-style interaction

## Tech Stack

- React Native
- Flask
- TensorFlow
- Python
- MediaPipe
- OpenCV

## Setup

### Backend

```bash
cd indiansignlanguage/backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

### Frontend

```bash
cd indiansignlanguage/frontend
npm install
npm start
```

## Demo

> Demo placeholder: add a video or animated GIF showing sign translation in action here.

## Notes

- This project is actively under development.
- The current prototype demonstrates strong real-time accuracy and a practical accessibility use case.
