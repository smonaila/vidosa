namespace vidosa.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class addCommentDate : DbMigration
    {
        public override void Up()
        {
            AddColumn("dbo.Comments", "DateTime", c => c.DateTime(nullable: false));
        }
        
        public override void Down()
        {
            DropColumn("dbo.Comments", "DateTime");
        }
    }
}
