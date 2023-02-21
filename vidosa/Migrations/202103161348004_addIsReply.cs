namespace vidosa.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class addIsReply : DbMigration
    {
        public override void Up()
        {
            AddColumn("dbo.Comments", "IsReply", c => c.Boolean(nullable: false));
        }
        
        public override void Down()
        {
            DropColumn("dbo.Comments", "IsReply");
        }
    }
}
