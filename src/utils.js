export async function fetch_buffer(url) {
    const resp = await fetch(url);
    return await resp.arrayBuffer();
}

export async function fetch_buffer_view(url) {
    return new Uint8Array(await fetch_buffer(url));
}