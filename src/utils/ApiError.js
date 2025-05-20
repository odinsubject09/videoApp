class ApiError extends Error{
    constructor(
        statusCode,
        message="something went wrong",
        errors=[],
        stack=""
    )
    {
        super(message)
        this.statusCode=statusCode
        this.data=null//what is present in this.data field?
        this.success=false
        this.errors=errors

    }
}

export {ApiError}