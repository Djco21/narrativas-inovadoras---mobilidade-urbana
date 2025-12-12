import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'drive-narrative-proxy',
      configureServer(server) {
        server.middlewares.use('/api/narrative', async (req, res, next) => {
          try {
            // Fetch from Google Drive (Node.js can follow redirects and ignore CORS)
            const driveResponse = await fetch('https://docs.google.com/uc?export=download&id=1-o0LleJ9kcmERDP5eEfd_H_wV0R2FnXy');

            if (!driveResponse.ok) {
              throw new Error(`Drive responded with ${driveResponse.status}`);
            }

            const text = await driveResponse.text();
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.end(text);
          } catch (error) {
            console.error('Error fetching narrative from Drive:', error);
            res.statusCode = 500;
            res.end('Error loading narrative');
          }
        });
      }
    }
  ],
})
