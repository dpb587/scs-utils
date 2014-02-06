# Manifest

Individual containers require some configuration. Some wrapper scripts, puppet, cloud tools, and, of course, Docker are
used to make the containers more powerful. Each image must be a separate repository and in each repository there must be
a `scs/manifest.yaml` file. This file describes the integration points of the image (not how they're integrated).

    # human-friendly information about the image # optional
    about:
        title: WordPress Web Application
        description: Standalone PHP application server
        maintainer: ~

    # information for the tools when building the docker container
    docker:

        # equivalent to FROM from a Dockerfile; only `ubuntu:precise` works
        from: ubuntu:precise

    # a list of services this container both provides and requires
    dependencies:

        # a list of services the image exposes # optional
        provides:

            # the key should briefly describe the service
            http:

                # human-friendly name for it # optional
                description: HTTP Server

                # the port the service runs on in the container
                port: 80
                
                # the protocol (i.e. `tcp` or `udp`) # default `tcp`
                protocol: tcp

        # a list of services the image needs # optional
        requires:

            # the key should briefly describe the service
            mysql:

                # human-friendly name for it # optional
                description: MySQL Server

                # a script which can be invoked if the server changes # optional
                liveupdate: /scs/scs/bin/update-requires-mysql.sh

    # a list of mounts which must be persist outside of the image
    volumes:

        # the key should briefly describe the data
        uploads:

            # human-friendly name for it # optional
            description: Uploads (wp-content/uploads)

    # a list of services which are run in the container (via supervisord) # optional
    services:

        # the key should briefly describe the service
        nginx:

            # human-friendly name for it # optional
            description: Web Server

        php-fpm:
            description: Application Server
