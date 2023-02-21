namespace vidosa.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class addPostUrl : DbMigration
    {
        public override void Up()
        {
            AddColumn("dbo.Posts", "PostUrl", c => c.String());
        }
        
        public override void Down()
        {
            DropColumn("dbo.Posts", "PostUrl");
        }
    }
}
