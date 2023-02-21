namespace vidosa.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class addCommentDate2 : DbMigration
    {
        public override void Up()
        {
            AddColumn("dbo.CommentReplies", "CommentDate", c => c.DateTime(nullable: false));
        }
        
        public override void Down()
        {
            DropColumn("dbo.CommentReplies", "CommentDate");
        }
    }
}
