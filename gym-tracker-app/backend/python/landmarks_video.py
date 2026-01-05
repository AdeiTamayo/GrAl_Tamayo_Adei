import mediapipe as mp
from mediapipe.tasks.python import vision
import numpy as np
import cv2
import argparse
import os

# Pose connections for drawing lines between landmarks
POSE_CONNECTIONS = [
    (0, 1), (1, 2), (2, 3), (3, 7), (0, 4), (4, 5), (5, 6), (6, 8),
    (9, 10), (11, 12), (11, 13), (13, 15), (15, 17), (15, 19), (15, 21),
    (17, 19), (12, 14), (14, 16), (16, 18), (16, 20), (16, 22), (18, 20),
    (11, 23), (12, 24), (23, 24), (23, 25), (24, 26), (25, 27), (26, 28),
    (27, 29), (28, 30), (29, 31), (30, 32), (27, 31), (28, 32)
]


# Draw pose landmarks manually using OpenCV
def draw_landmarks_on_image(rgb_image, detection_result):
    annotated_image = np.copy(rgb_image)

    if not detection_result.pose_landmarks:
        return annotated_image

    height, width, _ = annotated_image.shape

    for pose_landmarks in detection_result.pose_landmarks:
        # Convert normalized landmarks to pixel coordinates
        landmarks_px = []
        for lm in pose_landmarks:
            x_px = int(lm.x * width)
            y_px = int(lm.y * height)
            landmarks_px.append((x_px, y_px))

        # Draw connections
        for start_idx, end_idx in POSE_CONNECTIONS:
            if start_idx < len(landmarks_px) and end_idx < len(landmarks_px):
                start_point = landmarks_px[start_idx]
                end_point = landmarks_px[end_idx]
                cv2.line(annotated_image, start_point, end_point, (0, 255, 0), 2)

        # Draw landmarks
        for (x_px, y_px) in landmarks_px:
            cv2.circle(annotated_image, (x_px, y_px), 5, (255, 0, 0), -1)

    return annotated_image


def main(input_path, output_path):
    model_path = os.path.join(os.path.dirname(__file__), 'pose_landmarker_heavy.task')

    # Initialize PoseLandmarker
    try:
        options = vision.PoseLandmarkerOptions(
            base_options=mp.tasks.BaseOptions(model_asset_path=model_path),
            running_mode=vision.RunningMode.VIDEO
        )
        landmarker = vision.PoseLandmarker.create_from_options(options)
    except Exception as e:
        print(f"Error while creating the PoseLandmarker: {e}")
        return

    cap = cv2.VideoCapture(input_path)
    if not cap.isOpened():
        print(f"Error: Cannot open input video {input_path}")
        return

    fps = cap.get(cv2.CAP_PROP_FPS)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    frame_idx = 0

    while cap.isOpened():
        success, frame = cap.read()
        if not success:
            break

        rgb_image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_image)

        timestamp_ms = int((frame_idx / fps) * 1000) if fps else frame_idx
        detection_result = landmarker.detect_for_video(mp_image, timestamp_ms)

        annotated_rgb = draw_landmarks_on_image(rgb_image, detection_result)
        annotated_bgr = cv2.cvtColor(annotated_rgb, cv2.COLOR_RGB2BGR)

        out.write(annotated_bgr)
        frame_idx += 1

    cap.release()
    out.release()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Input video path")
    parser.add_argument("--output", required=True, help="Output video path")
    args = parser.parse_args()

    main(args.input, args.output)
