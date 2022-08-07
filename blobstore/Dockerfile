# Setup an S3 compatible blobstore which can host files
FROM minio/minio
# Copy over the command line client tool to do setup
COPY --from=docker.io/minio/mc:latest /usr/bin/mc /usr/bin/mc
RUN mkdir /buckets
# Start the server just for local configuration
RUN minio server /buckets & \
    server_pid=$!; \
    until mc alias set local http://localhost:9000 minioadmin minioadmin; do \
        sleep 1; \
    done; \
    mc mb local/bucket1; \
    echo this is file1 | mc pipe local/bucket1/file1; \
    echo this is file2 | mc pipe local/bucket1/file2; \
    kill $server_pid
CMD ["server", "/buckets", "--console-address", ":9001"]

