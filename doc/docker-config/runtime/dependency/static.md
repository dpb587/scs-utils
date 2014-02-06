# static

The `static` dependency method can be used to explicitly define the IP/port a dependency uses.

## Usage (`provide`)

Options:

    # host IP address to listen on # required
    ip: ~

    # port number to listen on # required
    port: ~


## Usage (`require`)

Options:

    # a list of endpoints to use
    endpoints:

        -

            # remote IP address # required
            ip: ~

            # remote port number # required
            port: ~

            # alist of attributes about the endpoint, if used # optional
            attributes: {}
