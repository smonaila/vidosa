namespace vidosa.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class removePostId : DbMigration
    {
        public override void Up()
        {
            DropPrimaryKey("dbo.Posts");
            AddColumn("dbo.Posts", "Id", c => c.Int(nullable: false, identity: false));
            AddColumn("dbo.Posts", "PostKey", c => c.String());

            for (int i = 0; i < 41; i++)
            {
                Sql(string.Format("UPDATE dbo.Posts SET Id = {0}, PostKey = '{1}' WHERE PostId = {2}", i + 1, Guid.NewGuid().ToString().Replace("-", ""), i + 1)); 
            }

            AddPrimaryKey("dbo.Posts", "Id");
            DropColumn("dbo.Posts", "PostId");
            DropColumn("dbo.PostSEOs", "PostId");
        }
        
        public override void Down()
        {
            AddColumn("dbo.PostSEOs", "PostId", c => c.Int(nullable: false));
            AddColumn("dbo.Posts", "PostId", c => c.Int(nullable: false, identity: true));
            DropPrimaryKey("dbo.Posts");
            DropColumn("dbo.Posts", "PostKey");
            DropColumn("dbo.Posts", "Id");
            AddPrimaryKey("dbo.Posts", "PostId");
        }
    }
}
