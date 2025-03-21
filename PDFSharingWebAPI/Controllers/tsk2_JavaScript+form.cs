using Microsoft.AspNetCore.Mvc;

namespace PDFSharingWebAPI.Controllers;
[ApiController]
[Route("api/[controller]")]
public class tsk2_JavaScript_formController : ControllerBase
{
    [HttpGet("multiply")]
    public IActionResult Multiply([FromQuery] double a, [FromQuery] double b)
    {
        try
        {
            var result = a * b;
            return Ok(new { Result = result });
        }
        catch (Exception ex)
        {
            return BadRequest(new { Error = ex.Message });
        }
    }
}
