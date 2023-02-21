namespace vidosa.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class addRedirects1 : DbMigration
    {
        public override void Up()
        {
            AddColumn("dbo.Redirects", "UserId", c => c.String());
            AddColumn("dbo.Redirects", "OldUrlId", c => c.String());
            AddColumn("dbo.Redirects", "NewUrlId", c => c.String());
            AddColumn("dbo.Redirects", "DateCreated", c => c.DateTime(nullable: false));
            AddColumn("dbo.Redirects", "DateModified", c => c.DateTime(nullable: false));
        }
        
        public override void Down()
        {
            DropColumn("dbo.Redirects", "DateModified");
            DropColumn("dbo.Redirects", "DateCreated");
            DropColumn("dbo.Redirects", "NewUrlId");
            DropColumn("dbo.Redirects", "OldUrlId");
            DropColumn("dbo.Redirects", "UserId");
        }
    }
}
