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

VOLUME ["/app/config/"]
CMD [ "node", "index.js" ]
