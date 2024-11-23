(module
  (import "Date" "now" (func $now (result i32)))
  (func (export "timestamp") (result i32)
    call $now
    ;; Convert to seconds
    i32.const 1000
    i32.div_u
  )
)
