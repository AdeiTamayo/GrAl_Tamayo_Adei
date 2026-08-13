import { supabase } from "../utils/supabaseClient";
import { getMyId } from "./client";
import { VideoRecord } from "./types";

const UPLOADS_BUCKET = 'uploads';
const PROCESSED_BUCKET = 'processed';

export async function uploadRawVideo(file: File): Promise<string> {
    const userId = await getMyId();
    const path = `${userId}/${crypto.randomUUID()}.${file.name.split('.').pop() ?? 'mp4'}`;
    const { error } = await supabase.storage
        .from(UPLOADS_BUCKET)
        .upload(path, file, { upsert: false });
    if (error) throw new Error(error.message);
    return path;
}

export async function uploadProcessedVideo(blob: Blob, fileName: string): Promise<string> {
    const userId = await getMyId();
    const path = `${userId}/${crypto.randomUUID()}-${fileName}`;
    const { error } = await supabase.storage
        .from(PROCESSED_BUCKET)
        .upload(path, blob, { contentType: blob.type || 'video/webm', upsert: false });
    if (error) throw new Error(error.message);

    const { data } = supabase.storage.from(PROCESSED_BUCKET).getPublicUrl(path);

    const probe = await fetch(data.publicUrl, {
        method: 'GET',
        headers: { Range: 'bytes=0-0' },
    });
    if (!probe.ok && probe.status !== 206) {
        await supabase.storage.from(PROCESSED_BUCKET).remove([path]);
        throw new Error('Processed video could not be read from storage');
    }

    return data.publicUrl;
}

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
    const userId = await getMyId();
    const { data: row, error } = await supabase
        .from('videos')
        .insert({
            user_id: userId,
            filename: data.filename ?? null,
            process_type: data.process_type ?? null,
            processed_url: data.processed_url ?? null,
            status: data.status ?? 'completed',
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

export async function deleteVideo(id: number, processedUrl?: string | null): Promise<void> {
    if (processedUrl) {
        const marker = `/object/public/${PROCESSED_BUCKET}/`;
        const idx = processedUrl.indexOf(marker);
        if (idx !== -1) {
            const path = decodeURIComponent(processedUrl.slice(idx + marker.length));
            await supabase.storage
                .from(PROCESSED_BUCKET)
                .remove([path])
                .catch(() => undefined);
        }
    }
    await deleteVideoRecord(id);
}
