/**
 * @param {Request} req 
 * @returns {Promise<Response>}
 */
export default async function handle(req) {
    const text = await req.text();
    return new Response("The client sent: " + text);
}
