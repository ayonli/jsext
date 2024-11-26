import { connect, bindUdp } from "../net.ts";

function encodeDomainName(domain: string): Uint8Array {
    const parts = domain.split('.');
    const encoded = [];
    for (const part of parts) {
        encoded.push(part.length);
        for (const char of part) {
            encoded.push(char.charCodeAt(0));
        }
    }
    encoded.push(0); // End of QNAME
    return new Uint8Array(encoded);
}

function constructDnsQuery(domain: string): Uint8Array {
    const header = new Uint8Array([
        0x12, 0x34, // ID
        0x01, 0x00, // Flags (standard query)
        0x00, 0x01, // QDCOUNT (1 question)
        0x00, 0x00, // ANCOUNT (0 answers)
        0x00, 0x00, // NSCOUNT (0 authority records)
        0x00, 0x00  // ARCOUNT (0 additional records)
    ]);

    const question = encodeDomainName(domain);
    const qtype = new Uint8Array([0x00, 0x01]); // QTYPE (A record)
    const qclass = new Uint8Array([0x00, 0x01]); // QCLASS (IN)

    const query = new Uint8Array(header.length + question.length + qtype.length + qclass.length);
    query.set(header, 0);
    query.set(question, header.length);
    query.set(qtype, header.length + question.length);
    query.set(qclass, header.length + question.length + qtype.length);

    return query;
}

const domain = "example.com";
const dnsQuery = constructDnsQuery(domain);
// console.log(dnsQuery);

const socket = await bindUdp();
console.log(socket);

// send a DNS query
await socket.send(dnsQuery, {
    hostname: "8.8.8.8",
    port: 53
});

// read the response
const response = await socket.receive();
console.log(response);

const stream = await socket.connect({
    hostname: "8.8.8.8",
    port: 53,
});

const writer = stream.writable.getWriter();
const reader = stream.readable.getReader();

await writer.write(dnsQuery);

const { value } = await reader.read();
console.log(value);

socket.close();
