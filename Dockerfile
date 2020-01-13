FROM node:lts

# Создать директорию app
WORKDIR /app

# Установить зависимости приложения
# Используется символ подстановки для копирования как package.json, так и package-lock.json,
# работает с npm@5+
COPY . ./

RUN npm install --unsafe-perm
# Используется при сборке кода в продакшене
# RUN npm install --only=production

RUN cd /tmp && \
curl -LO https://download.oracle.com/otn_software/linux/instantclient/195000/instantclient-basic-linux.x64-19.5.0.0.0dbru.zip && \
unzip instantclient*.zip && \
rm instantclient*.zip && \
mv instantclient_19_5 /oracle && \
cd /app && \
echo 'export LD_LIBRARY_PATH=/oracle:$LD_LIBRARY_PATH' >> ~/.profile

RUN apt update && \
apt install -y libaio1

ENV LD_LIBRARY_PATH /oracle:$LD_LIBRARY_PATH

VOLUME ["/app/config/"]
CMD [ "node", "index.js" ]
