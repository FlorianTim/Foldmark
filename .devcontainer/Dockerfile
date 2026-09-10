FROM mcr.microsoft.com/playwright:v1.62.1-noble

USER root
RUN apt-get update \
    && apt-get install -y --no-install-recommends git python3 python3-pip python-is-python3 sudo \
    && rm -rf /var/lib/apt/lists/* \
    && usermod -aG sudo pwuser \
    && echo 'pwuser ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/pwuser
USER pwuser
