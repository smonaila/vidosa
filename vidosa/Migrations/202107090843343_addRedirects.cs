namespace vidosa.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class addRedirects : DbMigration
    {
        public override void Up()
        {
            CreateTable(
                "dbo.Redirects",
                c => new
                    {
                        Id = c.Int(nullable: false, identity: true),
                        UrlIdFrom = c.String(),
                        UrlIdTo = c.String(),
                    })
                .PrimaryKey(t => t.Id);
            
        }
        
        public override void Down()
        {
            DropTable("dbo.Redirects");
        }
    }
}
