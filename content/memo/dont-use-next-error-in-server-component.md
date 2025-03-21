+++
title = 'Dont Use Next Error in Server Component'
date = 2024-08-25T11:50:59+09:00
draft = true
+++

_240825TIL_

아...진짜 오바야

`next/error` 는 Error Boundary 마냥 클래스 컴포넌트 기반이어서, SSR환경에 렌더링 되면 안된다.
근데 이제,,,직접적으로 사용한 것은 아니지만 import tree를 따라가다 나온 `@/lib/data.ts`와 같은 데이터 fetching하는 함수를 모아둔 파일에서 간접적으로 불러오고 있었어서
`Class extends value undefined is not a constructor or null` 가 발생하고 있었다..

1. `next/error`는 Class Component이다.
2. Class Component가 아무렇게나 렌더링되지 않도록 무분별한 import에 주의하자.
