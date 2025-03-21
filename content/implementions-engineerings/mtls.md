+++
title = '[Networks] MTLS'
date = 2024-10-20T16:41:36+09:00
draft = false
+++

## mTLS with cfssl

> NOTE: 개념에 대해 설명하지 않고, 간단한 구현을 진행하는 글입니다.
> mTLS와 CFSSL에 대해서는 아래 글을 참고해주세요.

mTLS: [rfc8705](https://datatracker.ietf.org/doc/html/rfc8705) <br />
cfssl: [cfssl](https://github.com/cloudflare/cfssl)

mTLS의 경우는 요 영상을 통해서도 어렵지 않게 접할 수 있다 :)

[토스ㅣSLASH 23 - 고객 불안을 0으로 만드는 토스의 Istio Zero Trust](https://www.youtube.com/watch?v=4sJd6PIkP_s&t=349s)

다만 위 영상에서 소개되는 istio의 경우, mTLS를 위한 다양한 기능을 제공하기에 어렵지 않게 프로덕션 환경에서 mTLS를 적용할 수 있다.

이 글에서 진행하는 내용은 istio를 이용한 것은 아니며, mTLS를 위해서 자체 CA를 구축하고, 이를 기반으로 두 애플리케이션이 연결될 수 있도록 하는 것을 목적으로 한다.
이 때 자체 CA 구축을 위해 cfssl을 사용하고, 직접 생성된 인증서를 기반으로 mTLS 통신을 진행하자.

## Implementation

기본적인 설정은 다음과 같다.

```txt
language: Go
dir name: mtls-client, mtls-server
core tool: CFSSL, tls(go package)
```

인증과 관련한 `.pem`, `.csr` 파일들의 경우, `~/.tls/` 에 적재한다.

먼저, 간단한 통신 규약이 정의된 `.proto` 파일을 작성하자.

/api/v1/

```proto
syntax = "proto3";
package tls.v1;
option go_package = "github.com/Geun-Oh/mtls-server/api/v1";

service Tester {
    rpc Request(TestRequest) returns (TestResponse) {}
}

message TestRequest {
    string id = 1;
}

message TestResponse {
    string data = 1;
}

```

이후, protobuf 파일들을 생성하자.

makefile

```makefile
.PHONY: compile
compile:
	protoc api/v1/*proto \
		--go_out=. \
		--go-grpc_out=. \
		--go_opt=paths=source_relative \
		--go-grpc_opt=paths=source_relative \
		--proto_path=.
```

통신은 위에 정의된 사항대로 50051번 포트에서 진행한다.

---

이제, cert file들을 생성하자. 로컬에서 진행하는 경우 어차피 한 곳에 client, server 인증서를 만들어 두고 쓸 수 있기 때문에,
생성을 한 번만 진행해도 무방하다.

또한, 다른 공인 CA처럼 브라우저에 CA Certification이 내장되어있는 것이 아니기 때문에, 인증을 위한 CA file 또한 함께 생성하고 관리해주어야한다.

먼저, CFSSL을 설치하자

```bash
go get github.com/cloudflare/cfssl/cmd/cfssl
go get github.com/cloudflare/cfssl/cmd/cfssljson
```

혹은 homebrew로도 가능하다.

```bash
brew install cfssl
```

이제, TLS 관련 설정을 정의한 파일들을 만들어주어야하는데, test 폴더를 생성해 안에 모아주었다.

ca-config.json

```json
{
  "signing": {
    "profiles": {
      "server": {
        "expiry": "8760h",
        "usages": ["signing", "key encipherment", "server auth"]
      },
      "client": {
        "expiry": "8760h",
        "usages": ["signing", "key encipherment", "client auth"]
      }
    }
  }
}
```

ca-csr.json

```json
{
  "CN": "Geun-Oh CA",
  "key": {
    "algo": "rsa",
    "size": 2048
  },
  "names": [
    {
      "C": "KR",
      "L": "GY",
      "ST": "SEOUL",
      "O": "N",
      "OU": "NCRC"
    }
  ]
}
```

이렇게 Custom CA에 대해 두 파일이 정의되어야한다.

`ca-config.json`: CA 서버의 설정 및 인증서 발급 규칙을 정의함. 다양한 인증서 발급 프로파일과 서명 정책을 구성함.
`ca-csr.json`: CA 자체의 인증서를 생성하기 위한 서명 요청 정보를 담고, 루트 인증서를 발급할 때 사용.

이런 차이가 있다. csr.json 파일들의 경우는 Certificate Signing Request에 대한 정의가 담긴 것으로, 각 요청들에 대한 세부적인 정의가 담겨있다고 볼 수 있다.

이제는 `client-csr.json`, `server-csr.json`에 대한 정의를 하자.

client-csr.json

```json
{
  "CN": "client",
  "hosts": [""],
  "key": {
    "algo": "rsa",
    "size": 2048
  },
  "names": [
    {
      "C": "KR",
      "L": "GY",
      "ST": "SEOUL",
      "O": "NC",
      "OU": "NCRC"
    }
  ]
}
```

server-csr.json

```json
{
  "CN": "127.0.0.1",
  "hosts": ["localhost", "127.0.0.1"],
  "key": {
    "algo": "rsa",
    "size": 2048
  },
  "names": [
    {
      "C": "KR",
      "L": "GY",
      "ST": "SEOUL",
      "O": "NC",
      "OU": "NCRC"
    }
  ]
}
```

이제, 이 파일들을 기반으로 실제 인증서를 생성하고 이를 `~/.tls/` 로 이동시키자. 전체 make 멸령어이다.

makefile

```makefile
.PHONY: gencert
gencert:
	cfssl gencert \
		-initca test/ca-csr.json | cfssljson -bare ca

	cfssl gencert \
		-ca=ca.pem \
		-ca-key=ca-key.pem \
		-config=test/ca-config.json \
		-profile=server \
		test/server-csr.json | cfssljson -bare server

	cfssl gencert \
		-ca=ca.pem \
		-ca-key=ca-key.pem \
		-config=test/ca-config.json \
		-profile=client \
		test/client-csr.json | cfssljson -bare client

	mv *.pem *.csr ${CONFIG_PATH}
```

이렇게 하고 다음 명령어를 수행하면 `.pem`, `.csr` 파일들을 확인 가능하다.

```bash
ls ~/.tls
ca-key.pem     ca.csr         ca.pem         client-key.pem client.csr     client.pem     server-key.pem server.csr     server.pem
```

이제 가져다가 쓰면 된다.

---

좀 더 불러오기 쉽도록 `/internal/config/files.go`에 경로를 명시적으로 설정해주었다.

/internal/config/files.go

```go
package config

import (
	"os"
	"path/filepath"
)

var (
	CAFile         = configFile("ca.pem")
	ServerCertFile = configFile("server.pem")
	ServerKeyFile  = configFile("server-key.pem")
	ClientCertFile = configFile("client.pem")
	ClientKeyFile  = configFile("client-key.pem")
)

func configFile(filename string) string {
	if dir := os.Getenv("CONFIG_DIR"); dir != "" {
		return filepath.Join(dir, filename)
	}

	homeDir, err := os.UserHomeDir()
	if err != nil {
		panic(err)
	}

	return filepath.Join(homeDir, ".tls", filename)
}
```

이후, 서버와 클라이언트 측에 각각 관련 TLS 설정을 진행하고 인증서 경로를 지정해주는 과정을 포함하자.
당연히, 여기서 클라이언트는 프론트가 아니다. 브라우저는 내 CA인증서 따위 가지고 있어주지 않는다.

mtls-server/internal/config/config.go

```go
package config

import (
	"crypto/tls"
	"crypto/x509"
	"os"
)

func TLSConfig() (*tls.Config, error) {
	cert, err := tls.LoadX509KeyPair(ServerCertFile, ServerKeyFile)
	if err != nil {
		return nil, err
	}

	caCert, err := os.ReadFile(CAFile)
	if err != nil {
		return nil, err
	}

	certPool := x509.NewCertPool()
	if !certPool.AppendCertsFromPEM(caCert) {
		return nil, err
	}

	return &tls.Config{
		Certificates: []tls.Certificate{cert},
		ClientAuth:   tls.RequireAndVerifyClientCert,
		ClientCAs:    certPool,
	}, nil
}
```

mtls-client/internal/config/config.go

```go
package config

import (
	"crypto/tls"
	"crypto/x509"
	"os"
)

func TLSConfig() (*tls.Config, error) {
	cert, err := tls.LoadX509KeyPair(ClientCertFile, ClientKeyFile)
	if err != nil {
		return nil, err
	}

	caCert, err := os.ReadFile(CAFile)
	if err != nil {
		return nil, err
	}

	certPool := x509.NewCertPool()
	if !certPool.AppendCertsFromPEM(caCert) {
		return nil, err
	}

	return &tls.Config{
		Certificates: []tls.Certificate{cert},
		RootCAs:      certPool,
	}, nil
}
```

위 설정에서, mTLS를 위해 서버가 클라이언트에게 인증서를 요청하는 설정은 아래에서 확인 가능하다.

```go
	return &tls.Config{
		Certificates: []tls.Certificate{cert},
		ClientAuth:   tls.RequireAndVerifyClientCert,
		ClientCAs:    certPool,
	}, nil
```

`tls.RequireAndVerifyClientCert`를 통해서 mTLS를 사용함을 명시할 수 있다.

---

이제는 일반 gRPC 통신을 만드는 것과 다르지 않다.

각 규약에 맞도록 rpc서버 구현체를 구현해주고, 정해진 포트에서 서버를 실행하고 클라이언트에서 요청을 보낸다.

mtls-server/main.go

```go
package main

import (
	"log"
	"net"

	pb "github.com/Geun-Oh/mtls-server/api/v1"
	"github.com/Geun-Oh/mtls-server/internal/config"
	"github.com/Geun-Oh/mtls-server/internal/server"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
)

func main() {
	lis, err := net.Listen("tcp", ":50051")
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	tlsConfig, err := config.TLSConfig()
	if err != nil {
		log.Fatalf("failed to get tls config: %v", err)
	}

	s := grpc.NewServer(grpc.Creds(credentials.NewTLS(tlsConfig)))
	pb.RegisterTesterServer(s, &server.Server{})

	log.Println("server is running on :50051")
	if err := s.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}
```

mtls-client/main.go

```go
package main

import (
	"context"
	"log"
	"time"

	pb "github.com/Geun-Oh/mtls-client/api/v1"
	"github.com/Geun-Oh/mtls-client/internal/config"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
)

func main() {

	tlsConfig, err := config.TLSConfig()
	if err != nil {
		log.Fatalf("failed get tls config")
	}

	conn, err := grpc.NewClient("localhost:50051", grpc.WithTransportCredentials(credentials.NewTLS(tlsConfig)))
	if err != nil {
		log.Fatalf("failed to connect: %v", err)
	}
	defer conn.Close()

	client := pb.NewTesterClient(conn)

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()

	r, err := client.Request(ctx, &pb.TestRequest{Id: "testId"})
	if err != nil {
		log.Fatalf("could not test: %v", err)
	}

	log.Printf("greeting: %s", r.Data)
}
```

서버를 실행한다.

```bash
go run main.go
오늘날짜 지금시간 server is running on :50051
```

클라이언트에서 요청을 보낸다.

```bash
go run main.go
오늘날짜 지금시간 greeting: hello from testId
```

---

간단하게 mTLS를 사용하여 zero trust 원칙에 기반하는 grpc 서버-클라이언트 통신을 구현했다.

클라우드 플레어는 좋은 회사다..
