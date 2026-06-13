import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="max-w-xl mx-auto p-8 mt-16 text-center">
                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-8 shadow-xl">
                        <h1 className="font-display text-2xl font-bold text-rose-400 uppercase italic mb-4">
                            Something went wrong
                        </h1>
                        <p className="text-zinc-400 text-sm mb-6">
                            {this.state.error?.message || 'An unexpected error occurred'}
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="bg-lime-400 text-black font-bold px-6 py-3 rounded-lg hover:bg-lime-300 transition-all"
                        >
                            Reload Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
