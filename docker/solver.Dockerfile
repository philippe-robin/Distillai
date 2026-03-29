FROM openfoam/openfoam2406-dev:latest
# This container is used by Celery workers for OpenFOAM simulations
VOLUME /data/solver
CMD ["tail", "-f", "/dev/null"]
