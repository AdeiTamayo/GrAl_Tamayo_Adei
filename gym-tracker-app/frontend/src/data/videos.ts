import { supabase } from "../utils/supabaseClient";
import { VideoRecord } from "./types";

export async function getVideos(): Promise<VideoRecord[]> {
    const { data, error } = await supabase
        .from('videos')
        .select('id, filename, process_type, processed_url, status, created_at')
        .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as VideoRecord[];
}

export async function createVideoRecord(data: {
    filename?: string | null;
    process_type?: string | null;
    processed_url?: string | null;
    status?: string | null;
}): Promise<VideoRecord> {
    const { data: row, error } = await supabase
        .from('videos')
        .insert({
            filename: data.filename ?? null,
            process_type: data.process_type ?? null,
            processed_url: data.processed_url ?? null,
            status: data.status ?? null,
        })
        .select('*')
        .single();
    if (error) throw new Error(error.message);
    return row as VideoRecord;
}

export async function updateVideoRecord(
    id: number,
    data: { filename?: string | null; process_type?: string | null; processed_url?: string | null; status?: string | null }
): Promise<VideoRecord | null> {
    const update: Record<string, unknown> = {};
    if (data.filename !== undefined) update.filename = data.filename;
    if (data.process_type !== undefined) update.process_type = data.process_type;
    if (data.processed_url !== undefined) update.processed_url = data.processed_url;
    if (data.status !== undefined) update.status = data.status;

    const { data: row, error } = await supabase
        .from('videos')
        .update(update)
        .eq('id', id)
        .select('*')
        .maybeSingle();
    if (error) throw new Error(error.message);
    return row as VideoRecord | null;
}

export async function deleteVideoRecord(id: number): Promise<void> {
    const { error } = await supabase.from('videos').delete().eq('id', id);
    if (error) throw new Error(error.message);
}
