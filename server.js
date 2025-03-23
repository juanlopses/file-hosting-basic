const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar almacenamiento de archivos con multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueName + ext);
    }
});

const upload = multer({ storage: storage });

// Servir archivos estáticos desde la carpeta "uploads"
app.use('/files', express.static('uploads'));

// Configurar el frontend con barra de carga y animaciones
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>File Hosting</title>
            <style>
                body {
                    background-color: #1a1a1a;
                    color: #fff;
                    font-family: Arial, sans-serif;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    margin: 0;
                }
                h1 {
                    color: #ff007a;
                    font-size: 48px;
                    margin: 0;
                }
                p {
                    color: #888;
                    font-size: 18px;
                    margin: 10px 0;
                }
                form {
                    margin-top: 20px;
                }
                input[type="file"] {
                    display: none;
                }
                label {
                    background-color: #333;
                    color: #fff;
                    padding: 15px 30px;
                    border: 2px solid #ff007a;
                    border-radius: 10px;
                    cursor: pointer;
                    font-size: 18px;
                    transition: background-color 0.3s;
                }
                label:hover {
                    background-color: #444;
                }
                label.uploading {
                    animation: pulse 1.5s infinite;
                }
                @keyframes pulse {
                    0% {
                        transform: scale(1);
                        border-color: #ff007a;
                    }
                    50% {
                        transform: scale(1.05);
                        border-color: #ff4da6;
                    }
                    100% {
                        transform: scale(1);
                        border-color: #ff007a;
                    }
                }
                #progressContainer {
                    width: 300px;
                    height: 10px;
                    background-color: #333;
                    border-radius: 5px;
                    margin-top: 20px;
                    display: none;
                }
                #progressBar {
                    width: 0%;
                    height: 100%;
                    background-color: #ff007a;
                    border-radius: 5px;
                    transition: width 0.3s ease-in-out;
                }
                #link {
                    margin-top: 20px;
                    color: #ff007a;
                    word-break: break-all;
                    text-align: center;
                }
                #copyButton {
                    background-color: #ff007a;
                    color: #fff;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 5px;
                    cursor: pointer;
                    margin-top: 10px;
                    font-size: 16px;
                    transition: background-color 0.3s;
                }
                #copyButton:hover {
                    background-color: #e6006d;
                }
            </style>
        </head>
        <body>
            <h1>file.ax</h1>
            <p>Simple & Private File Hosting</p>
            <form id="uploadForm" enctype="multipart/form-data">
                <label for="fileInput" id="uploadLabel">Select or drop file(s)</label>
                <input type="file" id="fileInput" name="file" onchange="uploadFile()">
            </form>
            <div id="progressContainer">
                <div id="progressBar"></div>
            </div>
            <div id="link"></div>

            <script>
                async function uploadFile() {
                    const fileInput = document.getElementById('fileInput');
                    const uploadLabel = document.getElementById('uploadLabel');
                    const progressContainer = document.getElementById('progressContainer');
                    const progressBar = document.getElementById('progressBar');
                    const linkDiv = document.getElementById('link');

                    // Mostrar la barra de progreso y activar la animación del botón
                    progressContainer.style.display = 'block';
                    uploadLabel.classList.add('uploading');
                    progressBar.style.width = '0%';
                    linkDiv.innerHTML = '';

                    const formData = new FormData();
                    formData.append('file', fileInput.files[0]);

                    // Crear una solicitud XMLHttpRequest para manejar el progreso
                    const xhr = new XMLHttpRequest();

                    // Actualizar la barra de progreso
                    xhr.upload.onprogress = (event) => {
                        if (event.lengthComputable) {
                            const percentComplete = (event.loaded / event.total) * 100;
                            progressBar.style.width = percentComplete + '%';
                        }
                    };

                    // Manejar la respuesta
                    xhr.onload = () => {
                        const result = JSON.parse(xhr.responseText);
                        progressContainer.style.display = 'none';
                        uploadLabel.classList.remove('uploading');

                        if (result.url) {
                            linkDiv.innerHTML = \`
                                File uploaded! Link: <a href="\${result.url}" target="_blank">\${result.url}</a><br>
                                <button id="copyButton" onclick="copyLink('\${result.url}')">Copy Link</button>
                            \`;
                        } else {
                            linkDiv.innerHTML = 'Error uploading file.';
                        }
                    };

                    // Manejar errores
                    xhr.onerror = () => {
                        progressContainer.style.display = 'none';
                        uploadLabel.classList.remove('uploading');
                        linkDiv.innerHTML = 'Error uploading file.';
                    };

                    // Iniciar la solicitud
                    xhr.open('POST', '/upload', true);
                    xhr.send(formData);
                }

                function copyLink(url) {
                    navigator.clipboard.writeText(url).then(() => {
                        alert('Link copied to clipboard!');
                    }).catch(err => {
                        console.error('Failed to copy: ', err);
                        alert('Failed to copy link. Please copy it manually.');
                    });
                }
            </script>
        </body>
        </html>
    `);
});

// Ruta para manejar la subida de archivos
app.post('/upload', (req, res) => {
    upload.single('file')(req, res, (err) => {
        if (err) {
            return res.status(500).json({ error: 'Error uploading file' });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Obtener el dominio del servidor dinámicamente desde la solicitud
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.headers['x-forwarded-host'] || req.get('host');
        const fileUrl = `${protocol}://${host}/files/${req.file.filename}`;

        res.json({ url: fileUrl });
    });
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
