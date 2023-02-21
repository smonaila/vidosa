namespace vidosa.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class updateRelatedContentProps : DbMigration
    {
        public override void Up()
        {
            AddColumn("dbo.RelatedPosts", "Key", c => c.String());
            AddColumn("dbo.RelatedPosts", "Identity", c => c.Int(nullable: false));
            AddColumn("dbo.RelatedPosts", "IsPost", c => c.Boolean(nullable: false));
            DropColumn("dbo.RelatedPosts", "PostKey");
            DropColumn("dbo.RelatedPosts", "PostId");
            DropColumn("dbo.RelatedPosts", "IsRelated");
        }
        
        public override void Down()
        {
            AddColumn("dbo.RelatedPosts", "IsRelated", c => c.Boolean(nullable: false));
            AddColumn("dbo.RelatedPosts", "PostId", c => c.String());
            AddColumn("dbo.RelatedPosts", "PostKey", c => c.String());
            DropColumn("dbo.RelatedPosts", "IsPost");
            DropColumn("dbo.RelatedPosts", "Identity");
            DropColumn("dbo.RelatedPosts", "Key");
        }
    }
}
