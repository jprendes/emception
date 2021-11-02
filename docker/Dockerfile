# We need Emscripten 2.0.31 or newer, something including: https://github.com/emscripten-core/emscripten/commit/e36ffafa8956e5181e62b2a446b193628adb94d2
# This makes using dladdr not fail, and provides a stub like implementation isntead.
# Building with 2.0.32 seems to fail with `undefined symbol wait4`, so use 2.0.31 instead.
# It might be related to this change: https://github.com/emscripten-core/emscripten/commit/be2fe9cdf2d6b7b9d0fc375177b9a18a2810fca4
# Probably it's `define`d as a different symbol.
FROM emscripten/emsdk:2.0.31

# clang-12 is most recent version of clang in base image.
RUN apt update && apt install -y docker.io clang-12 ninja-build jq brotli

# clang-12 binaries are installed with the `-12` suffix, so create symlinks without it.
RUN ls /usr/bin/ | grep "\-12" | sed -E 's/(.*)-12/\1/' | xargs -I{} ln -s /usr/bin/{}-12 /usr/bin/{}

# When running the contianer with a custom user/group, we need to provide that user with
# access to ~/.npm (in this case, /.npm).
# The easiest is to give access to everyone.
RUN mkdir -p /.npm && chmod a+rwx /.npm