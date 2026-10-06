# Build Stage
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Nilai berikut ditanamkan Vite ke dalam bundel SAAT BUILD, jadi diubah lewat
# build arg dan bukan lewat environment saat container jalan. Konsekuensinya:
# mengubah sub-jalur berarti build ulang image, bukan sekadar restart.
#
#   VITE_BASE_PATH  sub-jalur aplikasi, mis. /stunting-balita/  (default /)
#   VITE_API_URL    alamat API dari sudut pandang PERAMBAN
#   VITE_ALLOW_LOCAL_FALLBACK
#                   'true' mengizinkan peramban menghitung sendiri bila API
#                   tidak terjangkau. Harus 'false' di produksi: kalau 'true',
#                   alamat API yang salah tidak akan memunculkan galat apa pun —
#                   aplikasi tetap tampak benar padahal server tidak dipanggil.
ARG VITE_BASE_PATH=/
ARG VITE_API_URL=/api
ARG VITE_ALLOW_LOCAL_FALLBACK=false

ENV VITE_BASE_PATH=$VITE_BASE_PATH
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_ALLOW_LOCAL_FALLBACK=$VITE_ALLOW_LOCAL_FALLBACK

RUN npm run build

# Production Stage with Nginx
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
