Some tools for AWS cloud stuff...

    mkdir /usr/local/scs-utils
    cd /usr/local/scs-utils
    wget -O- https://github.com/dpb587/scs-docker-utils/archive/master.tar.gz | tar -xz --strip-components 1
    pip install --upgrade -r requirements.txt
    ln -s bin/* /usr/bin/
