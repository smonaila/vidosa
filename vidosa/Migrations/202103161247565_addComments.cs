namespace vidosa.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class addComments : DbMigration
    {
        public override void Up()
        {
            CreateTable(
                "dbo.CommentReplies",
                c => new
                    {
                        Id = c.Int(nullable: false, identity: true),
                        CommentId = c.String(),
                        ParentId = c.String(),
                    })
                .PrimaryKey(t => t.Id);
            
            CreateTable(
                "dbo.Comments",
                c => new
                    {
                        Id = c.Int(nullable: false, identity: true),
                        CommentType = c.Int(nullable: false),
                        CommentId = c.String(),
                        CommentKey = c.String(),
                    })
                .PrimaryKey(t => t.Id);
            
        }
        
        public override void Down()
        {
            DropTable("dbo.Comments");
            DropTable("dbo.CommentReplies");
        }
    }
}
