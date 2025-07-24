FROM golang:alpine AS builder
RUN apk --no-cache add git ca-certificates gcc g++ make
WORKDIR /code
COPY . .
RUN make

FROM alpine:latest AS prod
RUN apk --no-cache add ca-certificates
WORKDIR /app
VOLUME /app/data
ENV ARKDROP_DATA_DIR=/app/data
COPY --from=builder /code/arkdrop .
CMD ["./arkdrop"]
