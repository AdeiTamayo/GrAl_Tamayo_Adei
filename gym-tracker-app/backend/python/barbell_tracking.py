"""
Barbell Path Tracking with OpenCV + Roboflow YOLO

This script tracks the path of a barbell throughout a video and outputs 
a new video with the barbell trajectory drawn on it.

HYBRID APPROACH:
- Uses Roboflow YOLO inference for FIRST FRAME detection only
- OpenCV CSRT tracker for all subsequent frames (no more inference calls)
- This produces smooth, stable barbell trajectory

REQUIREMENTS:
- ROBOFLOW_API_KEY must be set in .env file
- inference-sdk package: pip install inference-sdk
- python-dotenv: pip install python-dotenv
- opencv-contrib-python for tracking

Author: Computer Vision Engineer
Date: 2026
"""

import cv2
import numpy as np
from collections import deque
import argparse
import os
from dotenv import load_dotenv

# Load environment variables from .env file
# This must be done BEFORE accessing any environment variables
load_dotenv()


# =============================================================================
# ROBOFLOW YOLO DETECTION
# =============================================================================

class RoboflowBarbellDetector:
    """
    Detects barbells using Roboflow's hosted YOLO model.
    
    IMPORTANT: This detector is used ONLY for first-frame detection.
    After detection, an OpenCV tracker takes over for efficiency.
    """
    
    def __init__(self):
        """
        Initialize the Roboflow inference client.
        
        Loads API key from environment variable ROBOFLOW_API_KEY.
        The client is initialized once and reused for all detections.
        """
        # Import here to avoid issues if inference_sdk is not installed
        try:
            from inference_sdk import InferenceHTTPClient
        except ImportError:
            raise ImportError(
                "inference-sdk not installed. Run: pip install inference-sdk"
            )
        
        # Load API key from environment
        self.api_key = '0jWtz8G3bfRWpUPz88XT'
        
        if not self.api_key or self.api_key == 'your_api_key_here':
            raise ValueError(
                "ROBOFLOW_API_KEY not set in .env file. "
                "Please add your API key to the .env file."
            )
        
        # Initialize the inference client ONCE (not per frame)
        # This connects to Roboflow's serverless inference API
        self.client = InferenceHTTPClient(
            api_url="https://serverless.roboflow.com",
            api_key=self.api_key
        )
        
        # Model ID for barbell detection
        self.model_id = "barbell-detector-bncfm/2"
        
        print(f"[Roboflow] Initialized with model: {self.model_id}")
    
    def _preprocess_frame(self, frame, min_dimension=640):
        """
        Preprocess frame for better detection on small/vertical videos.
        Scales up small images so YOLO can detect objects more reliably.
        
        Args:
            frame: Input BGR frame
            min_dimension: Minimum size for the smaller dimension
            
        Returns:
            Tuple (processed_frame, scale_factor) - scale_factor is used to convert
            coordinates back to original size
        """
        h, w = frame.shape[:2]
        
        # If the frame is already large enough, return as-is
        if min(h, w) >= min_dimension:
            return frame, 1.0
        
        # Calculate scale factor to make the smaller dimension = min_dimension
        scale = min_dimension / min(h, w)
        new_w = int(w * scale)
        new_h = int(h * scale)
        
        # Resize frame
        resized = cv2.resize(frame, (new_w, new_h), interpolation=cv2.INTER_LINEAR)
        
        print(f"[Roboflow] Upscaled frame from {w}x{h} to {new_w}x{new_h} (scale={scale:.2f})")
        
        return resized, scale
    
    def detect(self, frame, target_class="End"):
        """
        Detect barbell end in a single frame using Roboflow YOLO.
        
        Args:
            frame: Input BGR frame (numpy array from OpenCV)
            target_class: Class name to filter for (default: "End")
            
        Returns:
            Bounding box tuple (x, y, w, h) in OpenCV format, or None if not detected
        """
        try:
            # Preprocess frame for better detection on small videos
            processed_frame, scale = self._preprocess_frame(frame)
            
            # Run inference on the (possibly upscaled) frame
            result = self.client.infer(processed_frame, model_id=self.model_id)
            
            # Parse the inference result
            # Roboflow returns predictions in a specific format
            predictions = result.get('predictions', [])
            
            if not predictions:
                print("[Roboflow] No detections in frame")
                return None
            
            # Log ALL detections for debugging
            print(f"[Roboflow] Found {len(predictions)} detection(s):")
            for i, pred in enumerate(predictions):
                cls = pred.get('class', 'unknown')
                conf = pred.get('confidence', 0)
                print(f"  [{i+1}] class='{cls}', confidence={conf:.2f}")
            
            # Filter for target class ("End" by default)
            target_predictions = [p for p in predictions if p.get('class') == target_class]
            
            if not target_predictions:
                # If no "End" class found, try "Barbell" as fallback
                target_predictions = [p for p in predictions if p.get('class') == "Barbell"]
                if target_predictions:
                    print(f"[Roboflow] No '{target_class}' found, using 'Barbell' instead")
                else:
                    print(f"[Roboflow] No '{target_class}' or 'Barbell' class detected")
                    return None
            
            # Get the detection with highest confidence from filtered list
            best_prediction = max(target_predictions, key=lambda p: p.get('confidence', 0))
            detected_class = best_prediction.get('class', 'unknown')
            
            # Extract bounding box from prediction
            # Roboflow returns center coordinates (x, y) and dimensions (width, height)
            center_x = best_prediction.get('x', 0)
            center_y = best_prediction.get('y', 0)
            width = best_prediction.get('width', 0)
            height = best_prediction.get('height', 0)
            confidence = best_prediction.get('confidence', 0)
            
            # Scale coordinates back to original frame size
            center_x = center_x / scale
            center_y = center_y / scale
            width = width / scale
            height = height / scale
            
            # Convert from center format to OpenCV format (x, y, w, h)
            # where (x, y) is the TOP-LEFT corner
            x = int(center_x - width / 2)
            y = int(center_y - height / 2)
            w = int(width)
            h = int(height)
            
            print(f"[Roboflow] Using '{detected_class}': bbox=({x}, {y}, {w}, {h}), conf={confidence:.2f}")
            
            return (x, y, w, h)
            
        except Exception as e:
            print(f"[Roboflow] Detection error: {str(e)}")
            import traceback
            traceback.print_exc()
            return None


# =============================================================================
# ADJUSTABLE PARAMETERS
# =============================================================================

# Motion detection parameters
MOTION_THRESHOLD = 25          # Threshold for motion detection
MIN_MOTION_AREA = 1000         # Minimum contour area for motion detection
MAX_MOTION_AREA = 100000       # Maximum contour area

# Barbell detection parameters (for initial detection)
BARBELL_MIN_WIDTH = 50         # Minimum width of barbell bounding box
BARBELL_MIN_HEIGHT = 20        # Minimum height
BARBELL_ASPECT_RATIO_MIN = 1.5 # Barbells are typically wider than tall

# Tracker parameters
TRACKER_TYPE = 'CSRT'          # Options: 'CSRT', 'KCF', 'MOSSE'
DETECTION_FRAMES = 30          # Number of frames to analyze for initial detection

# Trajectory drawing parameters
TRAJECTORY_COLOR = (0, 0, 255)      # Red color (BGR)
TRAJECTORY_THICKNESS = 3            # Line thickness
MAX_TRAJECTORY_LENGTH = 500         # Maximum points in trajectory
ENABLE_FADING_TRAIL = True          # Enable fading effect on trail

# Visualization parameters
MARKER_COLOR = (0, 255, 0)          # Green for current position
MARKER_RADIUS = 8                   # Radius of position marker
BOX_COLOR = (255, 255, 0)           # Cyan for bounding box


# =============================================================================
# MOTION DETECTOR CLASS
# =============================================================================

class MotionDetector:
    """
    Detects moving objects using background subtraction.
    Used to automatically find the barbell in initial frames.
    """
    
    def __init__(self):
        """Initialize background subtractor."""
        # MOG2 background subtractor works well for gym environments
        self.bg_subtractor = cv2.createBackgroundSubtractorMOG2(
            history=100,
            varThreshold=50,
            detectShadows=False
        )
        self.motion_history = []
    
    def detect_motion(self, frame):
        """
        Detect moving regions in frame.
        
        Args:
            frame: Input BGR frame
            
        Returns:
            List of bounding boxes (x, y, w, h) for moving regions
        """
        # Apply background subtraction
        fg_mask = self.bg_subtractor.apply(frame)
        
        # Clean up mask
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_CLOSE, kernel)
        fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_OPEN, kernel)
        
        # Threshold
        _, fg_mask = cv2.threshold(fg_mask, MOTION_THRESHOLD, 255, cv2.THRESH_BINARY)
        
        # Find contours
        contours, _ = cv2.findContours(fg_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        motion_boxes = []
        for contour in contours:
            area = cv2.contourArea(contour)
            if MIN_MOTION_AREA < area < MAX_MOTION_AREA:
                x, y, w, h = cv2.boundingRect(contour)
                motion_boxes.append((x, y, w, h))
        
        return motion_boxes, fg_mask
    
    def find_barbell_candidate(self, motion_boxes):
        """
        From motion boxes, find the most likely barbell candidate.
        Barbells are typically horizontal (wider than tall).
        
        Args:
            motion_boxes: List of bounding boxes
            
        Returns:
            Best candidate bounding box, or None
        """
        candidates = []
        
        for box in motion_boxes:
            x, y, w, h = box
            
            # Check minimum size
            if w < BARBELL_MIN_WIDTH or h < BARBELL_MIN_HEIGHT:
                continue
            
            # Check aspect ratio (barbell should be horizontal)
            aspect_ratio = w / h if h > 0 else 0
            if aspect_ratio < BARBELL_ASPECT_RATIO_MIN:
                continue
            
            # Score based on size and aspect ratio
            score = w * h * aspect_ratio
            candidates.append((box, score))
        
        if not candidates:
            return None
        
        # Return highest scoring candidate
        candidates.sort(key=lambda x: x[1], reverse=True)
        return candidates[0][0]


# =============================================================================
# BARBELL TRACKER CLASS
# =============================================================================

class BarbellTracker:
    """
    Tracks barbell using OpenCV's tracking algorithms.
    Maintains trajectory history for visualization.
    """
    
    def __init__(self, tracker_type=TRACKER_TYPE):
        """
        Initialize tracker.
        
        Args:
            tracker_type: Type of OpenCV tracker ('CSRT', 'KCF', 'MOSSE')
        """
        self.tracker_type = tracker_type
        self.tracker = None
        self.initialized = False
        self.bbox = None
        
        # Trajectory storage
        self.trajectory = deque(maxlen=MAX_TRAJECTORY_LENGTH)
        
        # Tracking state
        self.frames_since_tracking_loss = 0
        self.max_frames_without_tracking = 15
    
    def _create_tracker(self):
        """Create a new OpenCV tracker instance.
        
        Handles both old and new OpenCV API versions.
        In OpenCV 4.5.1+, trackers moved to cv2.legacy module.
        """
        # Try new API first (cv2.legacy), then fall back to old API
        if self.tracker_type == 'CSRT':
            try:
                return cv2.legacy.TrackerCSRT_create()
            except AttributeError:
                return cv2.TrackerCSRT_create()
        elif self.tracker_type == 'KCF':
            try:
                return cv2.legacy.TrackerKCF_create()
            except AttributeError:
                return cv2.TrackerKCF_create()
        elif self.tracker_type == 'MOSSE':
            try:
                return cv2.legacy.TrackerMOSSE_create()
            except AttributeError:
                return cv2.TrackerMOSSE_create()
        else:
            # Default to CSRT
            try:
                return cv2.legacy.TrackerCSRT_create()
            except AttributeError:
                return cv2.TrackerCSRT_create()
    
    def init(self, frame, bbox):
        """
        Initialize tracker with bounding box.
        
        Args:
            frame: Initial frame
            bbox: Bounding box (x, y, w, h)
        """
        self.tracker = self._create_tracker()
        self.tracker.init(frame, bbox)
        self.initialized = True
        self.bbox = bbox
        self.frames_since_tracking_loss = 0
        
        # Add initial center to trajectory
        x, y, w, h = bbox
        center = (int(x + w/2), int(y + h/2))
        self.trajectory.append(center)
        
        print(f"[Tracker] Initialized with bbox: {bbox}")
    
    def update(self, frame):
        """
        Update tracker with new frame.
        
        Args:
            frame: Current frame
            
        Returns:
            Tuple (success, center_point, bbox)
        """
        if not self.initialized:
            return False, None, None
        
        success, bbox = self.tracker.update(frame)
        
        if success:
            x, y, w, h = [int(v) for v in bbox]
            center = (x + w // 2, y + h // 2)
            self.bbox = (x, y, w, h)
            self.trajectory.append(center)
            self.frames_since_tracking_loss = 0
            return True, center, (x, y, w, h)
        else:
            self.frames_since_tracking_loss += 1
            
            # Return last known position for a few frames
            if self.trajectory and self.frames_since_tracking_loss <= self.max_frames_without_tracking:
                return False, self.trajectory[-1], self.bbox
            
            return False, None, None
    
    def reinit(self, frame, bbox):
        """Reinitialize tracker with new bbox."""
        self.tracker = self._create_tracker()
        self.tracker.init(frame, bbox)
        self.bbox = bbox
        self.frames_since_tracking_loss = 0
        
        x, y, w, h = bbox
        center = (int(x + w/2), int(y + h/2))
        self.trajectory.append(center)
    
    def get_trajectory(self):
        """Get current trajectory points."""
        return list(self.trajectory)


# =============================================================================
# TRAJECTORY DRAWER CLASS
# =============================================================================

class TrajectoryDrawer:
    """
    Draws barbell trajectory on frames with fading effect.
    """
    
    def __init__(self, color=TRAJECTORY_COLOR, thickness=TRAJECTORY_THICKNESS,
                 enable_fading=ENABLE_FADING_TRAIL):
        """
        Initialize drawer.
        
        Args:
            color: BGR color tuple for trajectory
            thickness: Line thickness
            enable_fading: Whether to apply fading effect
        """
        self.color = color
        self.thickness = thickness
        self.enable_fading = enable_fading
    
    def draw(self, frame, trajectory, current_position=None, bbox=None):
        """
        Draw trajectory on frame.
        
        Args:
            frame: Input frame to draw on
            trajectory: List of (x, y) points
            current_position: Current barbell center (optional)
            bbox: Current bounding box (optional)
            
        Returns:
            Frame with trajectory drawn
        """
        output = frame.copy()
        
        # Draw trajectory
        if len(trajectory) >= 2:
            if self.enable_fading:
                self._draw_fading_trajectory(output, trajectory)
            else:
                points = np.array(trajectory, dtype=np.int32)
                cv2.polylines(output, [points], False, self.color, self.thickness)
        
        # Draw bounding box
        if bbox is not None:
            x, y, w, h = bbox
            cv2.rectangle(output, (x, y), (x + w, y + h), BOX_COLOR, 2)
        
        # Draw current position marker
        if current_position:
            cv2.circle(output, current_position, MARKER_RADIUS, MARKER_COLOR, -1)
            cv2.circle(output, current_position, MARKER_RADIUS + 2, (255, 255, 255), 2)
            
            # Draw coordinates
            text = f"({current_position[0]}, {current_position[1]})"
            cv2.putText(output, text, (current_position[0] + 15, current_position[1] - 15),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, MARKER_COLOR, 2)
        
        return output
    
    def _draw_fading_trajectory(self, frame, trajectory):
        """
        Draw trajectory with fading effect.
        Older points appear more faded.
        """
        num_points = len(trajectory)
        
        for i in range(1, num_points):
            # Calculate opacity based on position in trajectory
            alpha = (i / num_points) ** 0.7  # Power for smoother fade
            
            # Adjust color intensity
            faded_color = tuple(int(c * max(0.2, alpha)) for c in self.color)
            
            # Calculate thickness
            current_thickness = max(1, int(self.thickness * max(0.5, alpha)))
            
            # Draw line segment
            pt1 = trajectory[i - 1]
            pt2 = trajectory[i]
            cv2.line(frame, pt1, pt2, faded_color, current_thickness)


# =============================================================================
# VIDEO PROCESSOR CLASS
# =============================================================================

class VideoProcessor:
    """
    Main class for processing video files.
    
    HYBRID APPROACH:
    - Uses Roboflow YOLO for FIRST FRAME detection only
    - Uses OpenCV CSRT tracker for all subsequent frames
    - This minimizes API calls while maintaining accurate tracking
    """
    
    def __init__(self):
        """Initialize processor components."""
        # Initialize Roboflow detector for first-frame detection
        # This loads the API key and sets up the inference client
        try:
            self.barbell_detector = RoboflowBarbellDetector()
            self.use_roboflow = True
        except (ImportError, ValueError) as e:
            print(f"[Warning] Roboflow not available: {e}")
            print("[Warning] Falling back to motion-based detection")
            self.motion_detector = MotionDetector()
            self.use_roboflow = False
        
        # OpenCV tracker for subsequent frames
        self.tracker = BarbellTracker()
        
        # Trajectory drawer
        self.drawer = TrajectoryDrawer()
    
    def _detect_barbell_with_roboflow(self, cap):
        """
        Detect barbell using Roboflow YOLO on frames sampled throughout video.
        
        Args:
            cap: Video capture object
            
        Returns:
            Tuple (frame, bbox) or (None, None) if not found
        """
        print("[Detection] Using Roboflow YOLO for detection...")
        
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        # Sample frames from different parts of the video
        # Try: frame 0, 10%, 20%, 30%, 40%, 50% of video
        sample_positions = [0, 0.1, 0.2, 0.3, 0.4, 0.5]
        sample_frames = [int(total_frames * pos) for pos in sample_positions]
        
        print(f"[Detection] Will sample frames: {sample_frames} (total: {total_frames})")
        
        for i, frame_num in enumerate(sample_frames):
            # Seek to the target frame
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_num)
            ret, frame = cap.read()
            
            if not ret:
                print(f"[Detection] Could not read frame {frame_num}")
                continue
            
            print(f"[Detection] Attempt {i + 1}/{len(sample_frames)} - frame {frame_num}, shape: {frame.shape}")
            
            # Save first frame for debugging
            if i == 0:
                try:
                    # Save to output directory for debugging
                    debug_dir = os.path.dirname(os.path.abspath(__file__))
                    debug_path = os.path.join(debug_dir, "..", "media", "output", "debug_frame.jpg")
                    cv2.imwrite(debug_path, frame)
                    print(f"[Debug] Saved first frame to: {debug_path}")
                except Exception as e:
                    print(f"[Debug] Could not save debug frame: {e}")
            
            # Run YOLO detection
            bbox = self.barbell_detector.detect(frame)
            
            if bbox:
                print(f"[Detection] Barbell found at frame {frame_num}")
                # Reset video to frame 0 for processing
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                ret, first_frame = cap.read()
                return first_frame, bbox
        
        print(f"[Detection] Failed to detect barbell in sampled frames")
        print("[Detection] TIP: Make sure the video contains a visible barbell with weights on the ends")
        return None, None
    
    def _detect_barbell_with_motion(self, cap, num_frames=DETECTION_FRAMES):
        """
        Fallback: Detect barbell using motion detection.
        Used when Roboflow is not available.
        
        Args:
            cap: Video capture object
            num_frames: Number of frames to analyze
            
        Returns:
            Tuple (frame, bbox) or (None, None) if not found
        """
        print(f"[Detection] Using motion detection (analyzing {num_frames} frames)...")
        
        detection_candidates = []
        frames_buffer = []
        
        for i in range(num_frames):
            ret, frame = cap.read()
            if not ret:
                break
            
            frames_buffer.append(frame)
            motion_boxes, _ = self.motion_detector.detect_motion(frame)
            candidate = self.motion_detector.find_barbell_candidate(motion_boxes)
            
            if candidate:
                detection_candidates.append((i, candidate, frame))
        
        if not detection_candidates:
            print("[Detection] No barbell candidates found")
            if frames_buffer:
                frame = frames_buffer[-1]
                h, w = frame.shape[:2]
                bbox = (w//4, h//4, w//2, h//4)
                print(f"[Detection] Using fallback region: {bbox}")
                return frame, bbox
            return None, None
        
        mid_idx = len(detection_candidates) // 2
        frame_idx, bbox, frame = detection_candidates[mid_idx]
        
        print(f"[Detection] Barbell detected at frame {frame_idx}: {bbox}")
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
        
        return frame, bbox
    
    def _detect_barbell_automatically(self, cap, num_frames=DETECTION_FRAMES):
        """
        Automatically detect barbell in the video.
        
        Uses Roboflow YOLO if available, otherwise falls back to motion detection.
        
        Args:
            cap: Video capture object
            num_frames: Number of frames for motion detection fallback
            
        Returns:
            Tuple (frame, bbox) or (None, None) if not found
        """
        if self.use_roboflow:
            return self._detect_barbell_with_roboflow(cap)
        else:
            return self._detect_barbell_with_motion(cap, num_frames)
    
    def process_video(self, input_path, output_path):
        """
        Process video file and output result with trajectory.
        
        Args:
            input_path: Path to input video file
            output_path: Path to output video file
            
        Returns:
            True if successful, False otherwise
        """
        # Open input video
        cap = cv2.VideoCapture(input_path)
        
        if not cap.isOpened():
            print(f"Error: Could not open video file: {input_path}")
            return False
        
        # Get video properties
        fps = int(cap.get(cv2.CAP_PROP_FPS))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        print(f"Input video: {width}x{height} @ {fps} FPS, {total_frames} frames")
        
        # Automatically detect barbell in initial frames
        init_frame, init_bbox = self._detect_barbell_automatically(cap)
        
        if init_frame is None:
            print("Error: Could not detect barbell in video")
            cap.release()
            return False
        
        # Initialize tracker
        self.tracker.init(init_frame, init_bbox)
        
        # Create video writer
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
        
        if not out.isOpened():
            print(f"Error: Could not create output video: {output_path}")
            cap.release()
            return False
        
        # Process remaining frames
        frame_count = int(cap.get(cv2.CAP_PROP_POS_FRAMES))
        tracking_success_count = 0
        
        print("Processing video...")
        
        while True:
            ret, frame = cap.read()
            
            if not ret:
                break
            
            frame_count += 1
            
            # Update tracker
            success, center, bbox = self.tracker.update(frame)
            
            if success:
                tracking_success_count += 1
            
            # Get trajectory
            trajectory = self.tracker.get_trajectory()
            
            # Draw trajectory on frame
            output_frame = self.drawer.draw(frame, trajectory, center, bbox)
            
            # Add status text
            status = "Tracking" if success else "Lost"
            cv2.putText(output_frame, f"Frame: {frame_count}/{total_frames} | {status}", 
                       (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            cv2.putText(output_frame, f"Trajectory points: {len(trajectory)}", 
                       (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 200), 1)
            
            # Write frame
            out.write(output_frame)
            
            # Print progress
            if frame_count % 50 == 0:
                progress = (frame_count / total_frames) * 100
                print(f"Progress: {progress:.1f}% ({frame_count}/{total_frames} frames)")
        
        # Cleanup
        cap.release()
        out.release()
        
        # Print summary
        tracking_rate = (tracking_success_count / frame_count) * 100 if frame_count > 0 else 0
        print(f"\nProcessing complete!")
        print(f"Total frames processed: {frame_count}")
        print(f"Tracking success rate: {tracking_rate:.1f}%")
        print(f"Output saved to: {output_path}")
        
        return True


# =============================================================================
# MAIN FUNCTION
# =============================================================================

def main():
    """
    Main entry point for barbell tracking script.
    """
    parser = argparse.ArgumentParser(
        description='Barbell Path Tracking with OpenCV',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python barbell_tracking.py -i input.mp4 -o output.mp4
  python barbell_tracking.py -i squat.mp4 -o squat_tracked.mp4
        """
    )
    
    parser.add_argument('-i', '--input', type=str, required=True,
                        help='Path to input video file')
    parser.add_argument('-o', '--output', type=str, required=True,
                        help='Path to output video file')
    
    args = parser.parse_args()
    
    # Validate input file
    if not os.path.exists(args.input):
        print(f"Error: Input file not found: {args.input}")
        return 1
    
    # Create processor and run
    processor = VideoProcessor()
    
    print(f"\nInput: {args.input}")
    print(f"Output: {args.output}")
    print("-" * 50)
    
    success = processor.process_video(args.input, args.output)
    
    return 0 if success else 1


# =============================================================================
# SCRIPT ENTRY POINT
# =============================================================================

if __name__ == "__main__":
    exit(main())
