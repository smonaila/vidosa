namespace vidosa.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class addIsDeleted : DbMigration
    {
        public override void Up()
        {
            AddColumn("dbo.Posts", "IsDeleted", c => c.Boolean(nullable: false));
        }
        
        public override void Down()
        {
            DropColumn("dbo.Posts", "IsDeleted");
        }
    }
}
