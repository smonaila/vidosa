using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace vidosa.Areas.finance.Controllers
{
    public class HomeController : Controller
    {
        // GET: finance/Home
        public ActionResult Index()
        {
            return View();
        }
    }
}