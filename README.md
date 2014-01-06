Assuming AWS and Ubuntu 13.10, it goes something like this...

    pip install -r requirements.txt
    ./bin/deploy-service-set --env dev dpb587-blog-test1 https://www.example.com/dpb587-blog-test1/manifest.yaml

`manifest.yaml`:

    description: "simple blog example"
    services:
      mysql:
        source:
          git: "https://github.com/dpb587/scs-mysql.git"
        puppet: "https://www.example.com/dpb587-blog-test1/mysql.pp"
        ports:
          - [ '1234', '3306' ]
        volumes:
          alldata:
            creation:
              size: 16
            format: "ext4"
            mounts:
              - binlog
              - data
      wordpress:
        source:
          git: "https://github.com/dpb587/scs-wordpress.git"
        puppet: "https://www.example.com/dpb587-blog-test1/wordpress.pp"
        ports:
          - [ '1235', '80' ]
        volumes:
          uploads:
            creation:
              size: 16
            format: "ext4"

`mysql.pp`:

    class {
        'scs' :
            mysqld_options => {
                expire_logs_days => 3,
                key_buffer_size => 16M,
                max_allowed_packet => 16M,
                max_binlog_size => 256M,
                query_cache_limit => 1M,
                query_cache_size => 64M,
                thread_cache_size => 8,
                thread_stack => 192K,
            },
            ;
    }


`wordpress.pp`:

    class {
        'scs' :
            http_host => 'dpb587-blog-test1.example.com'
            http_path => '/wordpress',
            database_host => '192.0.2.10',
            database_port => 1234,
            database_user => 'wptest1',
            database_password => 'wptest1',
            database_name => 'wptest1',
            database_tableprefix => 'wptest1_',
            wordpress_globals => {
                'WP_HOME' => "'http://dpb587-blog-test1.example.com/wordpress/'",
                'WP_SITEURL' => "'http://dpb587-blog-test1.example.com/wordpress/'",
                'FORCE_SSL_ADMIN' => 'false',
                'FORCE_SSL_LOGIN' => 'false',
            },
            wordpress_token_auth_key => ';(.y:!fn^:=S{}`t@rSs@||!2~e+X5(rH;X4r?G3{]c30ob9$?gO@_h`q:T}k-sL',
            wordpress_token_auth_salt => 'aS <uOBr-;7CRB*TNk_19R^-[|Sl0* yCc-mpq+-K|UXCZ{Y9;Y)wPG}6wW-K}i|',
            wordpress_token_secureauth_key => 'I,d`7u-=i7d7vbjG0rt/FGu-]/Xj^p2f}lY1}Tu^%9z/O|IwCh1~|tj63GP4vM-D',
            wordpress_token_secureauth_salt => '[<T,Lc(x}j%-cB.Q}`$K},cYQ|Hza|B7-KqFP}@er?_7d{B;,XswtZMdX>>Oi2L[',
            wordpress_token_loggedin_key => 'UIjYb7g<;;wbF~_Ckmhr%lR;[+UpFpVnye|>5l{7.+8i*a]MZzz^5q=o?(EhG,V3',
            wordpress_token_loggedin_salt => '_U.:ISZlR?F3h;o|~NH$b|K%xCiKUa35b|T9Y>1Zcmky+IJKMkr8<Kd,^h0G-6W%',
            wordpress_token_nonce_key => '6znnfr4gIF>18sX0A64J)gK)tR}*X+*-Y7-JGOGLenrgMgGA-EB?wDH0S?G_?PLK',
            wordpress_token_nonce_salt => 'Z]>sYx4>Q@xkrxg-{%7|7Q*=dBw)cMj0~RCXp.XAR5J%0{p9=M6*t3RsX29#wJqE',
            ;
    }
 
    scs::plugin {
        'jetpack' :
            source => 'http://downloads.wordpress.org/plugin/jetpack.2.7.zip',
            ;
    }
