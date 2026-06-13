interface VideoPlayerProps {
    src: string;
    className?: string;
    poster?: string;
}

export default function VideoPlayer({ src, className = '', poster }: VideoPlayerProps) {
    return (
        <div className={`bg-black border border-zinc-900 rounded-lg overflow-hidden relative shadow-inner ${className}`}>
            <video
                className="w-full h-full object-contain"
                controls
                preload="metadata"
                poster={poster}
            >
                <source src={src} type="video/mp4" />
                Your browser does not support the video tag.
            </video>
        </div>
    );
}
