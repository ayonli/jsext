(module
  (import "time" "unix" (func $fn (result i32)))
  (func (export "timestamp") (result i32)
    call $fn
  )
)
