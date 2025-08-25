import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import serveIndex from "serve-index";
import { promises as fs, createReadStream } from "fs"
import cors from 'cors'

const app = express();
const PORT = process.env.PORT || 4000;

// ✅ CORS config
app.use(cors());

// Recreate __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Public folder
const publicDir = path.resolve(__dirname, "public");

// Default route (index.html)
app.get("/", (req, res) => {
    res.sendFile(path.join(publicDir, "index.html"));
});

// Serve files + directory listing
app.use(
    "/files",
    express.static(publicDir),
    serveIndex(publicDir, { icons: true })
);

// Serve files as json
app.get("/book", async (req, res) => {
    const dirPath = path.join(publicDir, "books/Vanessa")

    const entries = await fs.readdir(dirPath, { withFileTypes: true, recursive: true });

    const files = await Promise.all(
        entries.filter(e => e.isFile()).map(async (entry) => {
            const fullPath = path.join(entry.parentPath, entry.name);
            const relativePath = path.relative(dirPath, entry.parentPath);
            const info = await fs.stat(fullPath);

            return {
                name: entry.name,
                path: path.join("/files/books/Vanessa", relativePath, entry.name),
                parentPath: entry.parentPath,
                relativePath: relativePath == '' ? '/' : relativePath,
                type: "file",
                size: info.size,        // in bytes,
            };
        })
    );

    res.json(files)
})

app.get("/file/hand-on-programming", (req, res) => {
    const filePath = path.join(publicDir, 'output.pdf'); // pdf file should be linearized

    fs.stat(filePath).then((stats) => {
        const range = req.headers.range;
        if (!range) {
            return res.status(405).end("Range requests required");
        }

        const [startStr, endStr] = range.replace(/bytes=/, "").split("-");
        const start = parseInt(startStr, 10);
        const end = endStr ? parseInt(endStr, 10) : stats.size - 1;

        if (start >= stats.size || end >= stats.size) {
            res.writeHead(416, { "Content-Range": `bytes */${stats.size}` });
            return res.end();
        }

        const chunkSize = end - start + 1;
        res.writeHead(206, {
            "Content-Encoding": "identity",
            "Content-Range": `bytes ${start}-${end}/${stats.size}`,
            "Accept-Ranges": "bytes",
            "Content-Length": chunkSize,
            "Content-Type": "application/pdf", // ✅ PDF.js needs correct type
        });

        createReadStream(filePath, { start, end }).pipe(res);
    }).catch(err => {
        return res.status(404).end("File not found");
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
