export async function fetch_buffer(url) {
    const resp = await fetch(url);
    return await resp.arrayBuffer();
}