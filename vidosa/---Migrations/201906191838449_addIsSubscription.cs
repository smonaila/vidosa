namespace vidosa.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class addIsSubscription : DbMigration
    {
        public override void Up()
        {
            AddColumn("dbo.Videos", "IsSubscription", c => c.Boolean(nullable: false));
        }
        
        public override void Down()
        {
            DropColumn("dbo.Videos", "IsSubscription");
        }
    }
}
