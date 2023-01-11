# Setup an S3 compatible blobstore which can host files
FROM minio/minio
# Copy over the command line client tool to do setup
COPY --from=docker.io/minio/mc:latest /usr/bin/mc /usr/bin/mc
# Start the server just for local configuration
RUN mkdir /buckets
RUN minio server /buckets & \
    server_pid=$!; \
    # Check for it to be up before proceeding
    until mc alias set local http://localhost:9000 minioadmin minioadmin; do \
        sleep 1; \
    done; \
    # Make default bucket
    mc mb local/uploads; \
    mc anonymous set download local/uploads; \
    # Close the server now that we're done configuring
    kill $server_pid
CMD ["server", "/buckets", "--console-address", ":9001"]