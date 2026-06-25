export default function ThemeTest() {
    return (
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-10">
            <h1 className="font-display text-3xl font-bold tracking-tight uppercase italic text-accent">
                Theme Contrast Test
            </h1>
            <p className="text-muted text-sm">Toggle light/dark to compare. Left column = old (lime-400), Right column = new (accent variable).</p>

            {/* Text Colors */}
            <section>
                <h2 className="text-heading font-bold mb-4 text-lg uppercase tracking-wide">Text Accent</h2>
                <div className="grid grid-cols-2 gap-6">
                    <div className="bg-card border border-subtle rounded-xl p-6 space-y-3">
                        <p className="text-xs font-semibold text-dim uppercase tracking-wider mb-2">Old: text-lime-400</p>
                        <p className="text-lime-400 text-lg font-bold">text-lime-400 heading</p>
                        <p className="text-lime-400 text-sm">text-lime-400 body text</p>
                        <span className="inline-block text-xs font-semibold text-lime-400 bg-lime-400/10 border border-lime-400/30 rounded-full px-3 py-1">Badge (lime-400)</span>
                        <div className="flex gap-2 mt-2">
                            <div className="w-9 h-9 rounded-lg bg-lime-400/10 border border-lime-400/20 flex items-center justify-center">
                                <svg className="w-4 h-4 text-lime-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            </div>
                        </div>
                    </div>
                    <div className="bg-card border border-subtle rounded-xl p-6 space-y-3">
                        <p className="text-xs font-semibold text-dim uppercase tracking-wider mb-2">New: text-accent</p>
                        <p className="text-accent text-lg font-bold">text-accent heading</p>
                        <p className="text-accent text-sm">text-accent body text</p>
                        <span className="inline-block text-xs font-semibold text-accent bg-accent/10 border border-accent/30 rounded-full px-3 py-1">Badge (accent)</span>
                        <div className="flex gap-2 mt-2">
                            <div className="w-9 h-9 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
                                <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Borders */}
            <section>
                <h2 className="text-heading font-bold mb-4 text-lg uppercase tracking-wide">Border Accent</h2>
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                        <div className="bg-card border border-lime-400/30 rounded-xl p-4">
                            <p className="text-xs text-dim">border-lime-400/30 on bg-card</p>
                        </div>
                        <div className="bg-surface border border-lime-400/40 rounded-lg p-3">
                            <p className="text-xs text-dim">border-lime-400/40 on bg-surface</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="bg-card border border-accent/30 rounded-xl p-4">
                            <p className="text-xs text-dim">border-accent/30 on bg-card</p>
                        </div>
                        <div className="bg-surface border border-accent/40 rounded-lg p-3">
                            <p className="text-xs text-dim">border-accent/40 on bg-surface</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Filled Buttons */}
            <section>
                <h2 className="text-heading font-bold mb-4 text-lg uppercase tracking-wide">Filled Buttons</h2>
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                        <button className="bg-lime-400 text-black font-bold px-6 py-3 rounded-lg">bg-lime-400</button>
                    </div>
                    <div className="space-y-3">
                        <button className="bg-accent text-black font-bold px-6 py-3 rounded-lg">bg-accent</button>
                    </div>
                </div>
            </section>

            {/* Real-world: DatePicker-style popup */}
            <section>
                <h2 className="text-heading font-bold mb-4 text-lg uppercase tracking-wide">DatePicker Popup (Real Example)</h2>
                <div className="grid grid-cols-2 gap-6">
                    <div className="relative">
                        <div className="border border-lime-400/30 rounded-xl bg-card shadow-xl p-6">
                            <button className="absolute -top-3 right-3 z-10 px-2.5 py-0.5 text-xs font-semibold text-lime-400 bg-card border border-lime-400/30 rounded-full shadow-sm">Close</button>
                            <p className="text-body text-sm">This uses old <code className="text-lime-400 text-xs">lime-400</code> classes</p>
                        </div>
                    </div>
                    <div className="relative">
                        <div className="border border-accent/30 rounded-xl bg-card shadow-xl p-6">
                            <button className="absolute -top-3 right-3 z-10 px-2.5 py-0.5 text-xs font-semibold text-accent bg-card border border-accent/30 rounded-full shadow-sm">Close</button>
                            <p className="text-body text-sm">This uses new <code className="text-accent text-xs">accent</code> classes</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ExercisePicker-style modal */}
            <section>
                <h2 className="text-heading font-bold mb-4 text-lg uppercase tracking-wide">Modal Wrapper (Real Example)</h2>
                <div className="grid grid-cols-2 gap-6">
                    <div className="border border-lime-400/30 rounded-xl bg-card shadow-xl overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-subtle">
                            <h3 className="font-bold uppercase italic text-lime-400">Old Modal</h3>
                            <button className="text-xs font-semibold text-lime-400 bg-lime-400/10 border border-lime-400/30 rounded-full px-2.5 py-0.5">Close</button>
                        </div>
                        <div className="p-4 text-sm text-body">Modal content here</div>
                    </div>
                    <div className="border border-accent/30 rounded-xl bg-card shadow-xl overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-subtle">
                            <h3 className="font-bold uppercase italic text-accent">New Modal</h3>
                            <button className="text-xs font-semibold text-accent bg-accent/10 border border-accent/30 rounded-full px-2.5 py-0.5">Close</button>
                        </div>
                        <div className="p-4 text-sm text-body">Modal content here</div>
                    </div>
                </div>
            </section>
        </div>
    );
}
