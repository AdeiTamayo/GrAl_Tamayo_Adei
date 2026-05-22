"""
Barbell Path Tracking with Roboflow YOLO + OpenCV CSRT

Tracks barbell path in video using:
- Roboflow YOLO for first-frame detection
- OpenCV CSRT tracker for all subsequent frames
"""

import cv2
import numpy as np
from collections import deque
import argparse
import os
from dotenv import load_dotenv
from inference_sdk import InferenceHTTPClient
import subprocess

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

FFMPEG_PATH = os.path.join(
    BASE_DIR,
    "tools",
    "ffmpeg",
    "bin",
    "ffmpeg.exe"
)

load_dotenv()


# =============================================================================
# CONFIGURATION
# =============================================================================

TRAJECTORY_COLOR = (0, 0, 255)      # Red (BGR)
TRAJECTORY_THICKNESS = 3
MAX_TRAJECTORY_LENGTH = 500         # Max number of points in trajectory (point per frame)
ENABLE_FADING_TRAIL = True
MARKER_COLOR = (0, 255, 0)          # Green
MARKER_RADIUS = 8
BOX_COLOR = (255, 255, 0)           # Cyan


# =============================================================================
# ROBOFLOW DETECTOR
# =============================================================================

class RoboflowBarbellDetector:
    """Detects barbells using Roboflow YOLO (first-frame only)."""
    
    def __init__(self):
        self.api_key = os.getenv("ROBOFLOW_API_KEY")
        self.client = InferenceHTTPClient(
            api_url="https://serverless.roboflow.com",
            api_key=self.api_key
        )
        self.model_id = "barbell-detector-bncfm/2"
    
    def _preprocess_frame(self, frame, min_dimension=640):
        """Upscale small frames for better detection."""
        h, w = frame.shape[:2]
        
        if min(h, w) >= min_dimension:
            return frame, 1.0
        
        scale = min_dimension / min(h, w)
        new_w, new_h = int(w * scale), int(h * scale)
        resized = cv2.resize(frame, (new_w, new_h), interpolation=cv2.INTER_LINEAR)
        print(f"[Roboflow] Upscaled frame from {w}x{h} to {new_w}x{new_h}")
        
        return resized, scale
    
    def detect(self, frame):
        """Detect barbell in frame, returns (x, y, w, h) or None."""
        processed_frame, scale = self._preprocess_frame(frame)
        result = self.client.infer(processed_frame, model_id=self.model_id)
        predictions = result.get('predictions', [])
        
        if not predictions:
            print("[Roboflow] No detections in frame")
            return None
        
        print(f"[Roboflow] Found {len(predictions)} detection(s):")
        for i, pred in enumerate(predictions):
            print(f"  [{i+1}] class='{pred.get('class')}', conf={pred.get('confidence', 0):.2f}")
        
        # Filter for Barbell class (case-insensitive)
        barbell_predictions = [p for p in predictions if p.get('class', '').lower() == 'barbell']
        
        if not barbell_predictions:
            print("[Roboflow] No 'Barbell' class detected")
            return None
        
        best = max(barbell_predictions, key=lambda p: p.get('confidence', 0))
        
        # Convert to OpenCV format and scale back
        center_x = best.get('x', 0) / scale
        center_y = best.get('y', 0) / scale
        width = best.get('width', 0) / scale
        height = best.get('height', 0) / scale
        
        x = int(center_x - width / 2)
        y = int(center_y - height / 2)
        w, h = int(width), int(height)
        
        print(f"[Roboflow] Using '{best.get('class')}': bbox=({x}, {y}, {w}, {h}), conf={best.get('confidence', 0):.2f}")
        return (x, y, w, h)


# =============================================================================
# BARBELL TRACKER
# =============================================================================

class BarbellTracker:
    """Tracks barbell using OpenCV CSRT tracker."""
    
    def __init__(self):
        self.tracker = None
        self.initialized = False
        self.bbox = None
        self.trajectory = deque(maxlen=MAX_TRAJECTORY_LENGTH)
    
    def _create_tracker(self):
        try:
            return cv2.legacy.TrackerCSRT_create() # TODO: Check if legacy can be removed
        except AttributeError:
            return cv2.TrackerCSRT_create()
    
    def init(self, frame, bbox):
        """Initialize tracker with bounding box."""
        self.tracker = self._create_tracker()
        self.tracker.init(frame, bbox)
        self.initialized = True
        self.bbox = bbox
        
        x, y, w, h = bbox
        self.trajectory.append((int(x + w/2), int(y + h/2)))
        print(f"[Tracker] Initialized with bbox: {bbox}")
    
    def update(self, frame):
        """Update tracker, returns (success, center, bbox)."""
        if not self.initialized:
            return False, None, None
        
        success, bbox = self.tracker.update(frame)
        
        if success:
            x, y, w, h = [int(v) for v in bbox]
            center = (x + w // 2, y + h // 2)
            self.bbox = (x, y, w, h)
            self.trajectory.append(center)
            return True, center, (x, y, w, h)
        
        return False, None, None
    
    def get_trajectory(self):
        return list(self.trajectory)


# =============================================================================
# TRAJECTORY DRAWER
# =============================================================================

class TrajectoryDrawer:
    """Draws barbell trajectory with fading effect."""
    
    def __init__(self):
        self.color = TRAJECTORY_COLOR
        self.thickness = TRAJECTORY_THICKNESS
    
    def draw(self, frame, trajectory, current_position=None, bbox=None):
        """Draw trajectory on frame."""
        output = frame.copy()
        
        # Draw fading trajectory
        if len(trajectory) >= 2:
            num_points = len(trajectory)
            for i in range(1, num_points):
                alpha = (i / num_points) ** 0.7
                faded_color = tuple(int(c * max(0.2, alpha)) for c in self.color)
                thickness = max(1, int(self.thickness * max(0.5, alpha)))
                cv2.line(output, trajectory[i-1], trajectory[i], faded_color, thickness)
        
        # Draw bounding box
        if bbox:
            x, y, w, h = bbox
            cv2.rectangle(output, (x, y), (x + w, y + h), BOX_COLOR, 2)
        
        # Draw current position marker
        if current_position:
            cv2.circle(output, current_position, MARKER_RADIUS, MARKER_COLOR, -1)
            cv2.circle(output, current_position, MARKER_RADIUS + 2, (255, 255, 255), 2)
        
        return output


# =============================================================================
# VIDEO PROCESSOR
# =============================================================================

class VideoProcessor:
    """Main video processing class."""
    
    def __init__(self):
        self.detector = RoboflowBarbellDetector()
        self.tracker = BarbellTracker()
        self.drawer = TrajectoryDrawer()
    
    def _detect_barbell(self, cap):
        """Detect barbell by sampling frames throughout video."""
        print("[Detection] Using Roboflow YOLO for detection...")
        
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        sample_positions = [0, 0.1] #, 0.2, 0.3, 0.4, 0.5
        sample_frames = [int(total_frames * pos) for pos in sample_positions]
        
        print(f"[Detection] Sampling frames: {sample_frames}")
        
        for i, frame_num in enumerate(sample_frames):
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_num)
            ret, frame = cap.read()
            
            if not ret:
                continue
            
            print(f"[Detection] Attempt {i + 1}/{len(sample_frames)} - frame {frame_num}")
            bbox = self.detector.detect(frame)
            
            if bbox:
                print(f"[Detection] Barbell found at frame {frame_num}")
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                ret, first_frame = cap.read()
                return first_frame, bbox
        
        print("[Detection] Failed to detect barbell")
        return None, None
    
    def process_video(self, input_path, output_path):
        """Process video and output with trajectory."""
        cap = cv2.VideoCapture(input_path)
        
        fps = int(cap.get(cv2.CAP_PROP_FPS))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        print(f"Input video: {width}x{height} @ {fps} FPS, {total_frames} frames")
        
        # Detect barbell
        init_frame, init_bbox = self._detect_barbell(cap)
        
        if init_frame is None:
            print("Error: Could not detect barbell in video")
            cap.release()
            return False
        
        # Initialize tracker
        self.tracker.init(init_frame, init_bbox)
        
        # Create video writer
        temp_output_path = output_path + ".tmp.mp4"
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(temp_output_path, fourcc, fps, (width, height))
        
        frame_count = 0
        print("Processing video...")
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            frame_count += 1
            
            # Update tracker
            success, center, bbox = self.tracker.update(frame)
            trajectory = self.tracker.get_trajectory()
            
            # Draw trajectory
            output_frame = self.drawer.draw(frame, trajectory, center, bbox)
            out.write(output_frame)
            
            # Print progress
            if frame_count % 50 == 0:
                progress = (frame_count / total_frames) * 100
                print(f"Progress: {progress:.1f}%")
        
        cap.release()
        out.release()

        print("[FFmpeg] Converting video...")

        ffmpeg_cmd = [
            FFMPEG_PATH,
            "-y",
            "-i", temp_output_path,
            "-c:v", "libx264",
            "-preset", "fast",
            "-movflags", "+faststart",
            "-pix_fmt", "yuv420p",
            output_path
        ]

        try:
            subprocess.run(ffmpeg_cmd, check=True)
            print(f"\nProcessing complete!")
            print(f"Total frames: {frame_count}")
            print(f"Output saved to: {output_path}")
            return True
        except Exception as e:
            print(f"Error executing FFmpeg or saving final output: {e}")
            return False
        finally:
            # Clean up the intermediate raw video file
            if os.path.exists(temp_output_path):
                os.remove(temp_output_path)
            
            # DELETE INPUT FILE: Safely removes the uploaded input video once done
            if os.path.exists(input_path):
                print(f"[Cleanup] Deleting input file: {input_path}")
                os.remove(input_path)


# =============================================================================
# MAIN
# =============================================================================

def main():
    parser = argparse.ArgumentParser(description='Barbell Path Tracking')
    parser.add_argument('-i', '--input', type=str, required=True, help='Input video path')
    parser.add_argument('-o', '--output', type=str, required=True, help='Output video path')
    args = parser.parse_args()
    
    print(f"\nInput: {args.input}")
    print(f"Output: {args.output}")
    print("-" * 50)
    
    processor = VideoProcessor()
    success = processor.process_video(args.input, args.output)
    
    return 0 if success else 1


if __name__ == "__main__":
    exit(main())