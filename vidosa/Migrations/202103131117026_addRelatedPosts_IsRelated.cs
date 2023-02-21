namespace vidosa.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class addRelatedPosts_IsRelated : DbMigration
    {
        public override void Up()
        {
            AddColumn("dbo.RelatedPosts", "IsRelated", c => c.Boolean(nullable: false));
        }
        
        public override void Down()
        {
            DropColumn("dbo.RelatedPosts", "IsRelated");
        }
    }
}
