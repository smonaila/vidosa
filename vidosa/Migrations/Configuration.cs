namespace vidosa.Migrations
{
    using System;
    using System.Collections.Generic;
    using System.Data.Entity;
    using System.Data.Entity.Migrations;
    using System.Linq;
    using System.Threading;
    using vidosa.Models;

    internal sealed class Configuration : DbMigrationsConfiguration<vidosa.Models.VidosaContext>
    {
        public Configuration()
        {
            AutomaticMigrationsEnabled = false;
        }

        protected override void Seed(vidosa.Models.VidosaContext context)
        {
            //  This method will be called after migrating to the latest version.

            //  You can use the DbSet<T>.AddOrUpdate() helper extension method 
            //  to avoid creating duplicate seed data.

            //using (VidosaContext vidosaContext = new VidosaContext())
            //{
            //    List<Comment> comments = (from c in vidosaContext.Comments
            //                              where c.IsReply == false
            //                              select c).ToList();

            //    for (int i = 0; i < comments.Count; i++)
            //    {
            //        comments[i].DateTime = RandomDate();
            //        vidosaContext.Entry(comments[i]).State = EntityState.Modified;
            //        vidosaContext.SaveChanges();
            //        Thread.Sleep(100);
            //    }
            //}            
        }

        //private DateTime RandomDate()
        //{
        //    Random random = new Random();
        //    DateTime start = new DateTime(2018, 1, 1, DateTime.Now.Hour, DateTime.Now.Minute, DateTime.Now.Second, DateTime.Now.Millisecond);
        //    DateTime end = new DateTime(2019, 01, 18, 3, 35, 56);
        //    int range = (end - start).Days;
        //    return start.AddDays(random.Next(range));
        //}
    }
}
