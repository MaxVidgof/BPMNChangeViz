FROM node:16-bullseye AS build

RUN mkdir viz

COPY ./src ./viz/src
COPY ./*json ./viz/
COPY ./*js ./viz/

WORKDIR ./viz/
RUN npm install
RUN npm run build

#WORKDIR ./dist/process-change-visualizer/

#EXPOSE 4200
#CMD ["npm", "run", "start"]
#CMD ["bash"]
#CMD ["python3", "-m", "http.server", "4200"]

FROM nginx:latest AS prod
COPY --from=build /viz/dist/process-change-visualizer /srv/www/changeviz
COPY ./nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 4200
#CMD ["bash"]
