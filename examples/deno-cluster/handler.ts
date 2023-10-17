export default async function handle(req: Request): Promise<Response> {
    const text = await req.text();
    return new Response("The client sent: " + text);
}
