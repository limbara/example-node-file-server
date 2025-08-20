import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import serveIndex from "serve-index";
import fs from 'node:fs/promises';
import cors from 'cors'

const app = express();
const PORT = process.env.PORT || 4000;

// Enable CORS for all routes and origins
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

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
